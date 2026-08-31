// UX-10 (Partners Visible + Discovery + Registration) — Tests de
// requestPartnerRegistration(). Verifica que este es realmente el único
// camino de escritura pública seguro: siempre crea `status: "pending"`
// e `is_test: false`, nunca acepta esos valores (ni `access_token`) como
// parámetro, y rechaza categorías fuera del CHECK real de la tabla.
//
// `requestPartnerRegistration()` marca deliberadamente `is_test: false`
// (es la función real que usará un comercio real) — así que cada fila
// creada aquí debe reconvertirse a `is_test: true` (UPDATE, nunca
// DELETE, mismo criterio ya establecido en CORE-1/2/3/4) DESPUÉS de
// comprobar el valor real que puso la función, para no dejar fixtures de
// este archivo de test contaminando Discovery en la base local.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { requestPartnerRegistration } from "./request-partner-registration";

async function markAsTestData(partnerId: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from("partners").update({ is_test: true }).eq("id", partnerId);
}

test("requestPartnerRegistration: crea el Partner con status=pending e is_test=false", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await requestPartnerRegistration({
    name: `RPR Test Business ${suffix}`,
    category: "gym",
  });

  assert.equal(result.outcome, "submitted");
  if (result.outcome !== "submitted") return;

  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("partners")
      .select("status, is_test, category, access_token")
      .eq("id", result.partnerId)
      .single();

    assert.equal(error, null);
    assert.equal(data!.status, "pending", "toda solicitud pública debe nacer pending, nunca active");
    assert.equal(data!.is_test, false, "una solicitud real nunca debe marcarse is_test");
    assert.equal(data!.category, "gym");
    assert.ok(data!.access_token, "access_token sigue generándose por defecto (gen_random_uuid()), pero nunca lo elige el llamante");
  } finally {
    await markAsTestData(result.partnerId);
  }
});

test("requestPartnerRegistration: genera un slug a partir del nombre", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await requestPartnerRegistration({
    name: `Café Núñez ${suffix}`,
    category: "restaurant",
  });

  assert.equal(result.outcome, "submitted");
  if (result.outcome !== "submitted") return;

  try {
    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("slug").eq("id", result.partnerId).single();
    assert.ok(data?.slug, "debe generarse un slug");
    assert.doesNotMatch(data!.slug as string, /[^a-z0-9-]/, "el slug generado debe ser solo minúsculas/números/guiones");
  } finally {
    await markAsTestData(result.partnerId);
  }
});

test("requestPartnerRegistration: categoría fuera del whitelist -> invalid_input, sin tocar la base", async () => {
  const result = await requestPartnerRegistration({
    name: `RPR Invalid Category ${Date.now()}`,
    category: "not-a-real-category",
  });
  assert.equal(result.outcome, "invalid_input");
});

test("requestPartnerRegistration: nombre vacío -> invalid_input", async () => {
  const result = await requestPartnerRegistration({ name: "   ", category: "gym" });
  assert.equal(result.outcome, "invalid_input");
});

test("requestPartnerRegistration: dos solicitudes con el mismo nombre generan slugs distintos (sin colisión)", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `RPR Duplicate Name ${suffix}`;

  const first = await requestPartnerRegistration({ name, category: "shop" });
  const second = await requestPartnerRegistration({ name, category: "shop" });

  assert.equal(first.outcome, "submitted");
  assert.equal(second.outcome, "submitted");
  if (first.outcome !== "submitted" || second.outcome !== "submitted") return;

  try {
    assert.notEqual(first.partnerId, second.partnerId);

    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("id, slug").in("id", [first.partnerId, second.partnerId]);
    const slugs = data?.map((row) => row.slug as string) ?? [];
    assert.equal(new Set(slugs).size, 2, "dos Partners con el mismo nombre nunca deben terminar con el mismo slug");
  } finally {
    await markAsTestData(first.partnerId);
    await markAsTestData(second.partnerId);
  }
});
