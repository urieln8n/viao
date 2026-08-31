// UX-16.3 (Commerce Identity) — Tests de integración de
// link_partner_owner() (RPC, SECURITY DEFINER) y de la RLS de `partners`
// que este mismo bloque añade. Mismo patrón exacto que
// lib/partners/register-partner-activity.test.ts: usuarios reales vía
// signUp + createServiceRoleClient para fixtures, nunca simulado — la
// seguridad del RPC/RLS solo queda demostrada probándola contra Supabase
// local real, no contra un mock.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { linkPartnerOwner } from "./link-partner-owner";
import { resolveOwnedPartners, isPartnerOwnerLinked } from "./resolve-partner-access";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; email: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partners-link-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partners-link-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, email, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(options: {
  status?: "active" | "pending" | "inactive";
  contactEmail?: string;
} = {}): Promise<{ id: string; accessToken: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name: `Test Partner Link ${suffix}`,
      slug: `test-partner-link-${suffix}`,
      category: "restaurant",
      status: options.status ?? "active",
      is_test: true,
      contact_email: options.contactEmail ?? null,
    })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string };
}

async function getOwnerId(partnerId: string): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("partners").select("owner_id").eq("id", partnerId).single();
  return (data?.owner_id as string | null) ?? null;
}

// ══════════════════════════ VINCULACIÓN — ÉXITO ══════════════════════════

test("link_partner_owner: access_token + email verificado coincidente -> vinculado, owner_id se asigna", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const result = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(result.outcome, "linked");

    const ownerId = await getOwnerId(partner.id);
    assert.equal(ownerId, userId);
  } finally {
    await deleteTestUser(userId);
  }
});

test("link_partner_owner: comparación de email es case-insensitive y con trim", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: `  ${email.toUpperCase()}  ` });
  try {
    const result = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(result.outcome, "linked", "el email debe coincidir sin importar mayúsculas/espacios");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ VINCULACIÓN — RECHAZOS (anti-enumeración) ══════════════════════════

test("link_partner_owner: email no coincide -> not_linked, owner_id permanece NULL", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: "otro-negocio@example.com" });
  try {
    const result = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(result.outcome, "not_linked");

    const ownerId = await getOwnerId(partner.id);
    assert.equal(ownerId, null);
  } finally {
    await deleteTestUser(userId);
  }
});

test("link_partner_owner: access_token inexistente -> not_linked, misma respuesta genérica que un email no coincidente", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const result = await linkPartnerOwner(sessionClient, crypto.randomUUID());
    assert.equal(result.outcome, "not_linked");
  } finally {
    await deleteTestUser(userId);
  }
});

test("link_partner_owner: Partner 'pending' (no active) -> not_linked, aunque el email coincida", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ status: "pending", contactEmail: email });
  try {
    const result = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(result.outcome, "not_linked");

    const ownerId = await getOwnerId(partner.id);
    assert.equal(ownerId, null);
  } finally {
    await deleteTestUser(userId);
  }
});

test("link_partner_owner: Partner ya vinculado a otro owner -> un segundo intento (email distinto) no puede reclamarlo", async () => {
  const { userId: ownerA, email: emailA, sessionClient: clientA } = await signUpUser();
  const { userId: ownerB, sessionClient: clientB } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: emailA });
  try {
    const first = await linkPartnerOwner(clientA, partner.accessToken);
    assert.equal(first.outcome, "linked");

    const second = await linkPartnerOwner(clientB, partner.accessToken);
    assert.equal(second.outcome, "not_linked", "un Partner ya vinculado no puede ser reclamado por otro owner");

    const ownerId = await getOwnerId(partner.id);
    assert.equal(ownerId, ownerA, "el owner original nunca debe cambiar");
  } finally {
    await deleteTestUser(ownerA);
    await deleteTestUser(ownerB);
  }
});

// ══════════════════════════ IDEMPOTENCIA ══════════════════════════

test("link_partner_owner: el propio owner ya vinculado puede repetir la llamada -> éxito, no error (reintento seguro)", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const first = await linkPartnerOwner(sessionClient, partner.accessToken);
    const second = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(first.outcome, "linked");
    assert.equal(second.outcome, "linked", "repetir la vinculación propia debe ser un no-op exitoso");

    const ownerId = await getOwnerId(partner.id);
    assert.equal(ownerId, userId);
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ ANÓNIMO ══════════════════════════

test("link_partner_owner: sin sesión (cliente anon) -> nunca vincula", async () => {
  const anonClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const partner = await createTestPartner({ contactEmail: "cualquiera@example.com" });

  const result = await linkPartnerOwner(anonClient, partner.accessToken);
  assert.equal(result.outcome, "not_linked");

  const ownerId = await getOwnerId(partner.id);
  assert.equal(ownerId, null);
});

// ══════════════════════════ RLS — SELECT ══════════════════════════

test("RLS: el owner ve su propia fila con las columnas permitidas", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    const { data, error } = await sessionClient
      .from("partners")
      .select("id, name, category, status")
      .eq("id", partner.id)
      .single();
    assert.equal(error, null, error?.message);
    assert.ok(data);
    assert.equal(typeof data!.name, "string", "sanity: la fila propia sí se lee (nombre presente)");
  } finally {
    await deleteTestUser(userId);
  }
});

test("RLS: access_token/contact_email/owner_id nunca son seleccionables desde un cliente, ni siquiera en la propia fila", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    // `select("*")` incluye las 3 columnas excluidas del GRANT
    // (20260831140000_add_partners_owner_id_identity.sql) -> Postgres
    // rechaza la consulta entera con "permission denied", no solo omite
    // esas columnas. Este es el comportamiento correcto y buscado, no un
    // fallo: confirma que ninguna de las 3 es alcanzable desde un cliente
    // `authenticated`, ni siquiera sobre su propia fila.
    const wildcard = await sessionClient.from("partners").select("*").eq("id", partner.id).single();
    assert.ok(wildcard.error, "select(*) debe fallar porque incluye columnas fuera del GRANT");

    for (const column of ["access_token", "contact_email", "owner_id"]) {
      const scoped = await sessionClient.from("partners").select(column).eq("id", partner.id).single();
      assert.ok(scoped.error, `select("${column}") debe fallar: esa columna nunca debe ser legible por un cliente`);
    }
  } finally {
    await deleteTestUser(userId);
  }
});

test("RLS: un usuario sin ownership no ve ninguna fila de un Partner ajeno", async () => {
  const { userId: owner, email, sessionClient: ownerClient } = await signUpUser();
  const { userId: stranger, sessionClient: strangerClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(ownerClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    const { data, error } = await strangerClient.from("partners").select("id, name").eq("id", partner.id);
    assert.equal(error, null, error?.message);
    assert.equal(data?.length, 0, "RLS debe devolver 0 filas para un Partner que no pertenece a este usuario");
  } finally {
    await deleteTestUser(owner);
    await deleteTestUser(stranger);
  }
});

// ══════════════════════════ RLS — UPDATE ══════════════════════════

test("RLS: el owner puede editar campos permitidos (name)", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    const { error } = await sessionClient.from("partners").update({ name: "Nombre editado por RLS" }).eq("id", partner.id);
    assert.equal(error, null, error?.message);

    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("name").eq("id", partner.id).single();
    assert.equal(data?.name, "Nombre editado por RLS");
  } finally {
    await deleteTestUser(userId);
  }
});

test("RLS + trigger: el owner NO puede modificar owner_id directamente", async () => {
  const { userId: owner, email, sessionClient: ownerClient } = await signUpUser();
  const { userId: stranger } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(ownerClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    // owner_id está excluido del GRANT de UPDATE (no en el allowlist de
    // columnas) — PostgREST debe rechazar la petición antes de que el
    // trigger siquiera intervenga.
    const { error } = await ownerClient
      .from("partners")
      .update({ owner_id: stranger })
      .eq("id", partner.id);
    assert.ok(error, "un UPDATE de owner_id desde el cliente debe fallar");

    const ownerIdAfter = await getOwnerId(partner.id);
    assert.equal(ownerIdAfter, owner, "owner_id nunca debe cambiar por un UPDATE de cliente");
  } finally {
    await deleteTestUser(owner);
    await deleteTestUser(stranger);
  }
});

test("RLS + trigger: el owner NO puede modificar status directamente", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    const { error } = await sessionClient
      .from("partners")
      .update({ status: "inactive" })
      .eq("id", partner.id);
    assert.ok(error, "un UPDATE de status desde el cliente debe fallar");

    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("status").eq("id", partner.id).single();
    assert.equal(data?.status, "active", "status nunca debe cambiar por un UPDATE de cliente");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ ON DELETE SET NULL ══════════════════════════

test("owner_id vuelve a NULL cuando se borra la cuenta Auth del owner (ON DELETE SET NULL), sin que el trigger lo bloquee", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
  assert.equal(linkResult.outcome, "linked");
  assert.equal(await getOwnerId(partner.id), userId);

  await deleteTestUser(userId);

  assert.equal(await getOwnerId(partner.id), null, "el Commerce debe sobrevivir sin owner, no bloquearse ni desaparecer");
});

// ══════════════════════════ "Camino B" — resolución por sesión ══════════════════════════

test("isPartnerOwnerLinked: false antes de vincular, true después", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: email });
  try {
    assert.equal(await isPartnerOwnerLinked(partner.id), false);

    const linkResult = await linkPartnerOwner(sessionClient, partner.accessToken);
    assert.equal(linkResult.outcome, "linked");

    assert.equal(await isPartnerOwnerLinked(partner.id), true);
  } finally {
    await deleteTestUser(userId);
  }
});

test("resolveOwnedPartners: devuelve exactamente los Partners de ese owner, nunca los de otro", async () => {
  const { userId: ownerA, email: emailA, sessionClient: clientA } = await signUpUser();
  const { userId: ownerB, email: emailB, sessionClient: clientB } = await signUpUser();
  const partnerA = await createTestPartner({ contactEmail: emailA });
  const partnerB = await createTestPartner({ contactEmail: emailB });
  try {
    assert.equal((await linkPartnerOwner(clientA, partnerA.accessToken)).outcome, "linked");
    assert.equal((await linkPartnerOwner(clientB, partnerB.accessToken)).outcome, "linked");

    const ownedByA = await resolveOwnedPartners(ownerA);
    assert.equal(ownedByA.length, 1);
    assert.equal(ownedByA[0].id, partnerA.id);
    assert.equal(ownedByA[0].accessToken, partnerA.accessToken);
    assert.ok(!ownedByA.some((p) => p.id === partnerB.id), "resolveOwnedPartners nunca debe incluir un Partner ajeno");
  } finally {
    await deleteTestUser(ownerA);
    await deleteTestUser(ownerB);
  }
});

test("resolveOwnedPartners: un mismo owner puede tener 2 Commerce (sin UNIQUE en owner_id)", async () => {
  const { userId, email, sessionClient } = await signUpUser();
  const partnerOne = await createTestPartner({ contactEmail: email });
  const partnerTwo = await createTestPartner({ contactEmail: email });
  try {
    assert.equal((await linkPartnerOwner(sessionClient, partnerOne.accessToken)).outcome, "linked");
    assert.equal((await linkPartnerOwner(sessionClient, partnerTwo.accessToken)).outcome, "linked");

    const owned = await resolveOwnedPartners(userId);
    assert.equal(owned.length, 2);
    const ids = owned.map((p) => p.id).sort();
    assert.deepEqual(ids, [partnerOne.id, partnerTwo.id].sort());
  } finally {
    await deleteTestUser(userId);
  }
});
