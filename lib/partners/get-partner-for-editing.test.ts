// UX-12 (Partner Self-Service C1) — Tests de getPartnerForEditing().
// Mismo patrón que resolve-partner-access.test.ts: función pura,
// testable directamente con node:test, sin contexto de Next.js.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { getPartnerForEditing } from "./get-partner-for-editing";

async function createTestPartner(status: "active" | "inactive" = "active"): Promise<{
  id: string;
  accessToken: string;
  name: string;
  category: string;
  description: string;
  contactPhone: string;
  address: string;
  imageUrl: string;
}> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fields = {
    name: `GPFE Test Partner ${suffix}`,
    slug: `gpfe-test-partner-${suffix}`,
    category: "restaurant",
    status,
    is_test: true,
    description: "Descripción de prueba",
    contact_phone: "600111222",
    address: "Calle Falsa 123",
    image_url: "https://example.com/image.jpg",
  };
  const { data, error } = await service.from("partners").insert(fields).select("id, access_token").single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return {
    id: data!.id as string,
    accessToken: data!.access_token as string,
    name: fields.name,
    category: fields.category,
    description: fields.description,
    contactPhone: fields.contact_phone,
    address: fields.address,
    imageUrl: fields.image_url,
  };
}

test("getPartnerForEditing: access_token válido de un Partner active devuelve exactamente los campos editables", async () => {
  const partner = await createTestPartner("active");
  const result = await getPartnerForEditing(partner.accessToken);

  assert.ok(result);
  assert.equal(result!.id, partner.id);
  assert.equal(result!.name, partner.name);
  assert.equal(result!.category, partner.category);
  assert.equal(result!.description, partner.description);
  assert.equal(result!.contactPhone, partner.contactPhone);
  assert.equal(result!.address, partner.address);
  assert.equal(result!.imageUrl, partner.imageUrl);
});

test("getPartnerForEditing: access_token de un Partner inactive -> undefined (mismo criterio que resolvePartnerAccess)", async () => {
  const partner = await createTestPartner("inactive");
  const result = await getPartnerForEditing(partner.accessToken);
  assert.equal(result, undefined);
});

test("getPartnerForEditing: access_token inexistente/con formato inválido -> undefined, sin lanzar", async () => {
  const missing = await getPartnerForEditing("00000000-0000-0000-0000-000000000000");
  assert.equal(missing, undefined);

  const garbage = await getPartnerForEditing("not-a-token");
  assert.equal(garbage, undefined);
});

test("getPartnerForEditing: el resultado nunca incluye access_token, status, is_test ni slug", async () => {
  const partner = await createTestPartner("active");
  const result = await getPartnerForEditing(partner.accessToken);
  assert.ok(result);

  const keys = Object.keys(result!);
  assert.deepEqual(
    keys.sort(),
    ["address", "category", "contactPhone", "description", "id", "imageUrl", "name"].sort(),
    "getPartnerForEditing debe limitarse exactamente a los campos editables, nunca access_token/status/is_test/slug",
  );
});

test("getPartnerForEditing: el token de un Partner A nunca devuelve datos del Partner B (aislamiento)", async () => {
  const partnerA = await createTestPartner("active");
  const partnerB = await createTestPartner("active");

  const resultA = await getPartnerForEditing(partnerA.accessToken);
  assert.equal(resultA?.id, partnerA.id);
  assert.notEqual(resultA?.id, partnerB.id);
});
