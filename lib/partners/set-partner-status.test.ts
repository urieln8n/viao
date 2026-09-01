// PARTNER APPROVAL V1 — Tests de integración de set_partner_status()
// (RPC, SECURITY DEFINER) y del carve-out de status en
// protect_partners_immutable_fields(). Mismo patrón exacto que
// lib/partners/link-partner-owner.test.ts: usuarios reales vía signUp +
// createServiceRoleClient para fixtures, nunca simulado — la seguridad
// del RPC/trigger solo queda demostrada probándola contra Supabase local
// real, no contra un mock.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { setPartnerStatus } from "./set-partner-status";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partner-status-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partner-status-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

// Solo service_role puede escribir raw_app_meta_data (garantía de la
// propia plataforma Supabase Auth, no una convención de la aplicación) —
// exactamente el mismo mecanismo que un administrador real usaría en
// Supabase Studio para marcar a alguien como partner_admin.
async function signUpPartnerAdmin(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const { userId, sessionClient } = await signUpUser();
  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role: "partner_admin" },
  });
  assert.equal(error, null, `no se pudo marcar partner_admin: ${error?.message}`);
  return { userId, sessionClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(status: "pending" | "active" | "inactive"): Promise<string> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name: `Test Partner Status ${suffix}`,
      slug: `test-partner-status-${suffix}`,
      category: "restaurant",
      status,
      is_test: true,
    })
    .select("id")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return data!.id as string;
}

async function getPartnerStatus(partnerId: string): Promise<string> {
  const service = createServiceRoleClient();
  const { data } = await service.from("partners").select("status").eq("id", partnerId).single();
  return data!.status as string;
}

// ══════════════════════════ AUTORIZACIÓN ══════════════════════════

test("set_partner_status: sin sesión (cliente anon) -> not_updated", async () => {
  const anonClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const partnerId = await createTestPartner("pending");

  const result = await setPartnerStatus(anonClient, partnerId, "active");
  assert.equal(result.outcome, "not_updated");
  assert.equal(await getPartnerStatus(partnerId), "pending", "el status nunca debe cambiar sin sesión");
});

test("set_partner_status: usuario autenticado sin partner_admin -> not_updated", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "active");
    assert.equal(result.outcome, "not_updated");
    assert.equal(await getPartnerStatus(partnerId), "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: usuario con partner_admin -> updated en una transición válida", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "active");
    assert.equal(result.outcome, "updated");
    assert.equal(await getPartnerStatus(partnerId), "active");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ MÁQUINA DE ESTADOS (partner_admin real) ══════════════════════════

test("set_partner_status: pending -> active permitido", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "active");
    assert.equal(result.outcome, "updated");
    assert.equal(await getPartnerStatus(partnerId), "active");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: pending -> inactive permitido", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "inactive");
    assert.equal(result.outcome, "updated");
    assert.equal(await getPartnerStatus(partnerId), "inactive");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: active -> inactive permitido", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("active");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "inactive");
    assert.equal(result.outcome, "updated");
    assert.equal(await getPartnerStatus(partnerId), "inactive");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: inactive -> active permitido (reactivación)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("inactive");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "active");
    assert.equal(result.outcome, "updated");
    assert.equal(await getPartnerStatus(partnerId), "active");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: cualquier transición hacia pending está prohibida (no existe 'pending' como destino en el tipo, verificado a nivel SQL)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const activePartnerId = await createTestPartner("active");
  const inactivePartnerId = await createTestPartner("inactive");
  try {
    // El tipo PartnerStatus de la app ya excluye "pending" en tiempo de
    // compilación — este test llama al RPC vía sessionClient.rpc()
    // directamente (bypaseando el tipo TS) para demostrar que la
    // prohibición es real a nivel de base de datos, no solo una
    // restricción de TypeScript.
    const toPendingFromActive = await sessionClient.rpc("set_partner_status", {
      p_partner_id: activePartnerId,
      p_new_status: "pending",
    });
    assert.equal(toPendingFromActive.data?.updated, false);
    assert.equal(await getPartnerStatus(activePartnerId), "active");

    const toPendingFromInactive = await sessionClient.rpc("set_partner_status", {
      p_partner_id: inactivePartnerId,
      p_new_status: "pending",
    });
    assert.equal(toPendingFromInactive.data?.updated, false);
    assert.equal(await getPartnerStatus(inactivePartnerId), "inactive");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: pending -> pending (no-op) rechazado", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await sessionClient.rpc("set_partner_status", { p_partner_id: partnerId, p_new_status: "pending" });
    assert.equal(result.data?.updated, false);
    assert.equal(await getPartnerStatus(partnerId), "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: active -> active (no-op) rechazado", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("active");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "active");
    assert.equal(result.outcome, "not_updated");
    assert.equal(await getPartnerStatus(partnerId), "active");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: inactive -> inactive (no-op) rechazado", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("inactive");
  try {
    const result = await setPartnerStatus(sessionClient, partnerId, "inactive");
    assert.equal(result.outcome, "not_updated");
    assert.equal(await getPartnerStatus(partnerId), "inactive");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: estado destino arbitrario ('closed') rechazado", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await sessionClient.rpc("set_partner_status", { p_partner_id: partnerId, p_new_status: "closed" });
    assert.equal(result.data?.updated, false);
    assert.equal(await getPartnerStatus(partnerId), "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

test("set_partner_status: 'approved' rechazado (nunca fue un valor válido de status, ver el bloqueo real diagnosticado en este mismo bloque)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  try {
    const result = await sessionClient.rpc("set_partner_status", { p_partner_id: partnerId, p_new_status: "approved" });
    assert.equal(result.data?.updated, false);
    assert.equal(await getPartnerStatus(partnerId), "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ ANTI-ENUMERACIÓN ══════════════════════════

test("set_partner_status: Partner inexistente y usuario no autorizado producen la misma respuesta externa", async () => {
  const { userId: adminId, sessionClient: adminClient } = await signUpPartnerAdmin();
  const { userId: strangerId, sessionClient: strangerClient } = await signUpUser();
  const realPartnerId = await createTestPartner("pending");
  try {
    const nonexistentPartnerResult = await setPartnerStatus(adminClient, crypto.randomUUID(), "active");
    const unauthorizedUserResult = await setPartnerStatus(strangerClient, realPartnerId, "active");

    assert.deepEqual(
      nonexistentPartnerResult,
      unauthorizedUserResult,
      "un Partner inexistente y un llamante no autorizado deben ser indistinguibles desde fuera",
    );
    assert.equal(nonexistentPartnerResult.outcome, "not_updated");
  } finally {
    await deleteTestUser(adminId);
    await deleteTestUser(strangerId);
  }
});

// ══════════════════════════ SEGURIDAD DEL TRIGGER ══════════════════════════

test("trigger: ni siquiera un partner_admin puede saltarse el RPC con un UPDATE directo de status, aunque sea dueño de ese Partner (RLS sí alcanza la fila)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partnerId = await createTestPartner("pending");
  const service = createServiceRoleClient();
  try {
    // Vinculado explícitamente como owner (vía service_role, nunca vía
    // link_partner_owner() -- ese RPC exige status='active', y aquí
    // queremos probar justo lo contrario): así RLS (partners_update_own,
    // "owner_id = auth.uid()") SÍ deja pasar la petición hasta la fila, y
    // el UPDATE llega realmente hasta el trigger -- el escenario más
    // exigente posible, no uno donde RLS ya lo bloquea antes de que el
    // trigger tenga oportunidad de intervenir.
    await service.from("partners").update({ owner_id: userId }).eq("id", partnerId);

    const { error } = await sessionClient.from("partners").update({ status: "active" }).eq("id", partnerId);
    assert.ok(error, "un UPDATE directo de status debe fallar incluso para el propio dueño con partner_admin");
    assert.equal(await getPartnerStatus(partnerId), "pending", "solo el RPC puede cambiar status, nunca un UPDATE directo");
  } finally {
    await deleteTestUser(userId);
  }
});

test("trigger: un UPDATE directo de status con service_role, SIN pasar por set_partner_status(), sigue bloqueado aunque el valor sea una transición 'válida' (prueba directa del riesgo señalado en la auditoría de diseño)", async () => {
  const service = createServiceRoleClient();
  const partnerId = await createTestPartner("pending");

  // Sin la señal transaccional que solo set_partner_status() escribe, el
  // carve-out por valor NO basta por sí solo — el trigger debe rechazar
  // esto exactamente igual que rechazaría cualquier otro campo protegido,
  // aunque 'pending' -> 'active' sea una transición semánticamente
  // válida y el rol sea service_role.
  const { error } = await service.from("partners").update({ status: "active" }).eq("id", partnerId);
  assert.ok(error, "un UPDATE directo con service_role, sin la señal del RPC, debe seguir bloqueado");
  assert.equal(await getPartnerStatus(partnerId), "pending");
});

test("trigger: owner_id/access_token/is_test/slug/id siguen bloqueados igual que antes de este bloque (regresión)", async () => {
  const service = createServiceRoleClient();
  const partnerId = await createTestPartner("active");

  const attempts: Array<[string, Record<string, unknown>]> = [
    ["owner_id", { owner_id: crypto.randomUUID() }],
    ["access_token", { access_token: crypto.randomUUID() }],
    ["is_test", { is_test: false }],
    ["slug", { slug: `hijacked-slug-${Date.now()}` }],
    ["id", { id: crypto.randomUUID() }],
  ];

  for (const [field, patch] of attempts) {
    const { error } = await service.from("partners").update(patch).eq("id", partnerId);
    assert.ok(error, `un UPDATE de ${field} debe seguir bloqueado por el trigger, sin cambios en este bloque`);
  }
});
