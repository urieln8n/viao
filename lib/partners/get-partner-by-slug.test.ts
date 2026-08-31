// UX-10 (Partners Visible + Discovery + Registration) — Tests de
// getPartnerBySlug(). Mismo patrón que get-active-partners.test.ts: un
// slug de un Partner pending/inactive/de test nunca debe ser visitable
// directamente en /partners/[slug], aunque alguien conozca o comparta la
// URL exacta (mismo criterio "no distinguir el motivo" que
// resolve-partner-access.ts ya aplica al access_token).
//
// Igual que en get-active-partners.test.ts, los controles positivos
// (`isTest: false`) se reconvierten a `is_test: true` en un `finally`
// tras comprobarlos — de lo contrario cada `npm test` dejaría fixtures
// indistinguibles de Partners reales en la base local.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { getPartnerBySlug } from "./get-partner-by-slug";

async function createPartner(overrides: {
  status?: "active" | "pending" | "inactive";
  isTest?: boolean;
}): Promise<{ id: string; slug: string; name: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `GPBS Test Partner ${suffix}`;
  const slug = `gpbs-test-partner-${suffix}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name,
      slug,
      category: "restaurant",
      status: overrides.status ?? "active",
      is_test: overrides.isTest ?? true,
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

test("getPartnerBySlug: Partner real y activo se resuelve correctamente por su slug", async () => {
  const partner = await createPartner({ status: "active", isTest: false });
  try {
    const result = await getPartnerBySlug(partner.slug);
    assert.ok(result, "un Partner real y activo debe resolverse");
    assert.equal(result?.id, partner.id);
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getPartnerBySlug: slug de un Partner pending -> undefined", async () => {
  const partner = await createPartner({ status: "pending", isTest: false });
  try {
    const result = await getPartnerBySlug(partner.slug);
    assert.equal(result, undefined, "un Partner pending no debe ser visitable en su perfil público");
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getPartnerBySlug: slug de un Partner inactive -> undefined", async () => {
  const partner = await createPartner({ status: "inactive", isTest: false });
  try {
    const result = await getPartnerBySlug(partner.slug);
    assert.equal(result, undefined, "un Partner inactive no debe ser visitable en su perfil público");
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getPartnerBySlug: slug de una fixture de test (is_test=true) -> undefined, aunque esté active", async () => {
  const partner = await createPartner({ status: "active", isTest: true });
  const result = await getPartnerBySlug(partner.slug);
  assert.equal(result, undefined, "una fixture de test no debe ser visitable en su perfil público");
});

test("getPartnerBySlug: slug inexistente -> undefined, sin lanzar", async () => {
  const result = await getPartnerBySlug("este-slug-no-existe-nunca");
  assert.equal(result, undefined);
});

test("getPartnerBySlug: el resultado nunca incluye access_token, contact_email ni contact_phone", async () => {
  const partner = await createPartner({ status: "active", isTest: false });
  try {
    const result = await getPartnerBySlug(partner.slug);
    assert.ok(result);
    const keys = Object.keys(result!);
    assert.ok(!keys.includes("access_token") && !keys.includes("accessToken"));
    assert.ok(!keys.includes("contact_email") && !keys.includes("contactEmail"));
    assert.ok(!keys.includes("contact_phone") && !keys.includes("contactPhone"));
  } finally {
    await markAsTestData(partner.id);
  }
});
