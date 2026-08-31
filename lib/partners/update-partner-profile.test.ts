// UX-12 (Partner Self-Service C1) — Tests de updatePartnerProfile(). El
// foco principal (§10 de la autorización) es demostrar que el allowlist
// de escritura es real: ningún campo sensible (status/access_token/
// is_test/slug/id) puede cambiar a través de esta función, ni siquiera
// si el llamante intenta enviarlo (smuggling a través de un cast, ya que
// TypeScript en sí mismo ya lo impide en el uso normal).

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { updatePartnerProfile, type PartnerProfileUpdateInput } from "./update-partner-profile";

async function createTestPartner(status: "active" | "inactive" = "active"): Promise<{
  id: string;
  accessToken: string;
  slug: string;
}> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const slug = `upp-test-partner-${suffix}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `UPP Test Partner ${suffix}`, slug, category: "restaurant", status, is_test: true })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string, slug };
}

async function readPartnerRow(id: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("name, category, description, contact_phone, address, image_url, status, access_token, is_test, slug")
    .eq("id", id)
    .single();
  assert.equal(error, null, `leer Partner de test falló: ${error?.message}`);
  return data!;
}

test("updatePartnerProfile: con un access_token válido, actualiza exactamente los campos permitidos y persiste", async () => {
  const partner = await createTestPartner("active");
  const result = await updatePartnerProfile(partner.accessToken, {
    name: "Nuevo nombre",
    category: "gym",
    description: "Nueva descripción",
    contactPhone: "600999888",
    address: "Nueva dirección 45",
    imageUrl: "https://example.com/new-image.jpg",
  });

  assert.equal(result.outcome, "updated");

  const row = await readPartnerRow(partner.id);
  assert.equal(row.name, "Nuevo nombre");
  assert.equal(row.category, "gym");
  assert.equal(row.description, "Nueva descripción");
  assert.equal(row.contact_phone, "600999888");
  assert.equal(row.address, "Nueva dirección 45");
  assert.equal(row.image_url, "https://example.com/new-image.jpg");
});

test("updatePartnerProfile: access_token inválido -> access_denied, sin modificar ninguna fila", async () => {
  const partner = await createTestPartner("active");
  const before = await readPartnerRow(partner.id);

  const result = await updatePartnerProfile("00000000-0000-0000-0000-000000000000", {
    name: "Intento no autorizado",
    category: "gym",
  });
  assert.equal(result.outcome, "access_denied");

  const after = await readPartnerRow(partner.id);
  assert.deepEqual(after, before, "un token inválido nunca debe modificar ningún Partner existente");
});

test("updatePartnerProfile: access_token de un Partner inactive -> access_denied (mismo criterio que resolvePartnerAccess)", async () => {
  const partner = await createTestPartner("inactive");
  const result = await updatePartnerProfile(partner.accessToken, { name: "X", category: "gym" });
  assert.equal(result.outcome, "access_denied");
});

test("updatePartnerProfile: categoría fuera del whitelist -> invalid_input, sin modificar la fila", async () => {
  const partner = await createTestPartner("active");
  const before = await readPartnerRow(partner.id);

  const result = await updatePartnerProfile(partner.accessToken, {
    name: "Nombre válido",
    category: "not-a-real-category",
  });
  assert.equal(result.outcome, "invalid_input");

  const after = await readPartnerRow(partner.id);
  assert.deepEqual(after, before);
});

test("updatePartnerProfile: nombre vacío -> invalid_input, sin modificar la fila", async () => {
  const partner = await createTestPartner("active");
  const before = await readPartnerRow(partner.id);

  const result = await updatePartnerProfile(partner.accessToken, { name: "   ", category: "gym" });
  assert.equal(result.outcome, "invalid_input");

  const after = await readPartnerRow(partner.id);
  assert.deepEqual(after, before);
});

test("updatePartnerProfile: un intento de enviar status/access_token/is_test/slug/id no los modifica — allowlist real, no solo de tipos", async () => {
  const partner = await createTestPartner("active");
  const before = await readPartnerRow(partner.id);

  // Simula un cliente que manipula la petición para intentar escribir
  // campos sensibles — TypeScript ya lo impediría en uso normal
  // (PartnerProfileUpdateInput no declara estos campos), este test
  // demuestra que aunque llegaran en tiempo de ejecución (fetch/JSON
  // manipulado a mano, sin pasar por el tipo), updatePartnerProfile()
  // nunca los lee: construye el UPDATE campo a campo, nunca `...input`.
  const maliciousInput = {
    name: "Nombre legítimo",
    category: "gym",
    status: "inactive",
    access_token: "11111111-1111-1111-1111-111111111111",
    is_test: false,
    slug: "slug-robado",
    id: "22222222-2222-2222-2222-222222222222",
  } as unknown as PartnerProfileUpdateInput;

  const result = await updatePartnerProfile(partner.accessToken, maliciousInput);
  assert.equal(result.outcome, "updated", "los campos permitidos (name/category) sí deben aplicarse");

  const after = await readPartnerRow(partner.id);
  assert.equal(after.name, "Nombre legítimo", "los campos permitidos sí cambian");
  assert.equal(after.category, "gym");
  assert.equal(after.status, before.status, "status nunca debe cambiar vía Self-Service");
  assert.equal(after.access_token, before.access_token, "access_token nunca debe cambiar vía Self-Service");
  assert.equal(after.is_test, before.is_test, "is_test nunca debe cambiar vía Self-Service");
  assert.equal(after.slug, before.slug, "slug nunca debe cambiar vía Self-Service");
});

test("updatePartnerProfile: el token del Partner A nunca puede modificar al Partner B (aislamiento)", async () => {
  const partnerA = await createTestPartner("active");
  const partnerB = await createTestPartner("active");
  const beforeB = await readPartnerRow(partnerB.id);

  const result = await updatePartnerProfile(partnerA.accessToken, { name: "Cambio desde A", category: "gym" });
  assert.equal(result.outcome, "updated");

  const afterB = await readPartnerRow(partnerB.id);
  assert.deepEqual(afterB, beforeB, "el token de A nunca debe poder modificar la fila de B");
});
