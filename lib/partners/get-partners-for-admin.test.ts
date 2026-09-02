// P10 (Admin Partners V1) — tests de getPartnersForAdmin()/isPartnerAdmin().
// Mismo patrón que get-active-partners.test.ts: función pura, testable
// directamente con node:test, Partner de test creado vía service_role y
// reconvertido a is_test=true en un `finally` (sin GRANT de DELETE sobre
// `partners`, mismo criterio ya documentado ahí).
//
// No se duplican aquí los 17 tests ya existentes de
// set-partner-status.test.ts (autorización real del RPC, las 4
// transiciones, anti-enumeración, protección del trigger) — este archivo
// cubre exclusivamente la pieza nueva de P10: la lectura administrativa
// (allowlist, sin filtro por status) y el guard puro de rol.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { getPartnersForAdmin, isPartnerAdmin } from "./get-partners-for-admin";

async function createPartner(overrides: {
  status?: "active" | "pending" | "inactive";
  contactEmail?: string | null;
}): Promise<{ id: string; slug: string; name: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `GPA Test Partner ${suffix}`;
  const slug = `gpa-test-partner-${suffix}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name,
      slug,
      category: "restaurant",
      status: overrides.status ?? "pending",
      is_test: true,
      contact_email: overrides.contactEmail ?? null,
    })
    .select("id")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, slug, name };
}

async function markAsTestData(partnerId: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from("partners").update({ is_test: true }).eq("id", partnerId);
}

test("getPartnersForAdmin: devuelve un Partner pending recién creado, con los campos del allowlist", async () => {
  const partner = await createPartner({ status: "pending", contactEmail: "negocio@example.com" });
  try {
    const partners = await getPartnersForAdmin();
    const found = partners.find((p) => p.id === partner.id);
    assert.ok(found, "el Partner recién creado debe aparecer en la lista administrativa");
    assert.equal(found!.name, partner.name);
    assert.equal(found!.category, "restaurant");
    assert.equal(found!.status, "pending");
    assert.equal(found!.contactEmail, "negocio@example.com");
    assert.ok(typeof found!.createdAt === "string" && found!.createdAt.length > 0);
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getPartnersForAdmin: NO filtra por status — un Partner active y uno inactive también aparecen", async () => {
  const active = await createPartner({ status: "active" });
  const inactive = await createPartner({ status: "inactive" });
  try {
    const partners = await getPartnersForAdmin();
    assert.ok(partners.some((p) => p.id === active.id), "un Partner active debe aparecer en la lista administrativa");
    assert.ok(partners.some((p) => p.id === inactive.id), "un Partner inactive debe aparecer en la lista administrativa");
  } finally {
    await markAsTestData(active.id);
    await markAsTestData(inactive.id);
  }
});

test("getPartnersForAdmin: contactEmail es null cuando el Partner no dejó contacto (nunca se inventa un valor)", async () => {
  const partner = await createPartner({ status: "pending", contactEmail: null });
  try {
    const partners = await getPartnersForAdmin();
    const found = partners.find((p) => p.id === partner.id);
    assert.ok(found, "precondición: el Partner debe aparecer en la lista");
    assert.equal(found!.contactEmail, null);
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getPartnersForAdmin: la forma devuelta nunca incluye access_token, owner_id ni is_test", async () => {
  const partner = await createPartner({ status: "pending" });
  try {
    const partners = await getPartnersForAdmin();
    assert.ok(partners.length > 0, "precondición: debe existir al menos un Partner");

    for (const p of partners) {
      const keys = Object.keys(p);
      assert.ok(!keys.includes("access_token") && !keys.includes("accessToken"), "nunca debe exponer access_token");
      assert.ok(!keys.includes("owner_id") && !keys.includes("ownerId"), "nunca debe exponer owner_id");
      assert.ok(!keys.includes("is_test") && !keys.includes("isTest"), "nunca debe exponer is_test");
    }
  } finally {
    await markAsTestData(partner.id);
  }
});

test("isPartnerAdmin: true únicamente cuando app_metadata.role === 'partner_admin'", () => {
  assert.equal(isPartnerAdmin({ app_metadata: { role: "partner_admin" } }), true);
});

test("isPartnerAdmin: false para un usuario autenticado normal (sin rol)", () => {
  assert.equal(isPartnerAdmin({ app_metadata: {} }), false);
  assert.equal(isPartnerAdmin({ app_metadata: { role: "otro_rol" } }), false);
});

test("isPartnerAdmin: false para null/undefined (no autenticado)", () => {
  assert.equal(isPartnerAdmin(null), false);
  assert.equal(isPartnerAdmin(undefined), false);
});
