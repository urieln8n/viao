// F6-02 (VIAO_ROADMAP.md) — Tests de la caché de `properties` contra
// Supabase local real (no un mock). `upsertPropertyCache` usa
// `createServiceRoleClient()` (sin `next/headers`), así que es totalmente
// ejercitable aquí, a diferencia de las funciones que dependen de la
// sesión (`lib/supabase/server.ts`) — ver el reporte de la fase para la
// verificación E2E real de esas.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "./upsert-property-cache";
import type { Property } from "../../types/travel";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

const TEST_PROPERTY: Property = {
  providerName: "f602_test_provider",
  providerPropertyId: `f602-test-${Date.now()}`,
  name: "F6-02 Test Hotel",
  city: "Madrid",
  country: "España",
  rating: 4.0,
  mainPhotoUrl: "https://example.test/photo.jpg",
};

async function cleanup(providerPropertyId: string) {
  const service = createServiceRoleClient();
  // service_role solo tiene INSERT/UPDATE sobre properties (migración
  // 20260818070000, alcance mínimo), no DELETE — limpieza vía psql/
  // superusuario, fuera de este proceso (ver el reporte de la fase).
  void service;
  void providerPropertyId;
}

test("upsertPropertyCache: crea una fila nueva y devuelve su id", async () => {
  const id = await upsertPropertyCache(TEST_PROPERTY);

  assert.ok(id);

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("properties")
    .select("id, provider_name, provider_property_id, name, city, country, rating")
    .eq("id", id)
    .single();

  assert.equal(error, null);
  assert.equal(data.provider_name, TEST_PROPERTY.providerName);
  assert.equal(data.provider_property_id, TEST_PROPERTY.providerPropertyId);
  assert.equal(data.name, TEST_PROPERTY.name);
  assert.equal(data.city, TEST_PROPERTY.city);
  assert.equal(data.country, TEST_PROPERTY.country);
  assert.equal(data.rating, TEST_PROPERTY.rating);

  await cleanup(TEST_PROPERTY.providerPropertyId);
});

test("upsertPropertyCache: la misma (provider_name, provider_property_id) se refresca, no se duplica", async () => {
  const first = await upsertPropertyCache(TEST_PROPERTY);

  const updated: Property = { ...TEST_PROPERTY, name: "F6-02 Test Hotel (renamed)", rating: 4.8 };
  const second = await upsertPropertyCache(updated);

  assert.equal(first, second, "el upsert debe devolver el mismo id, no crear una fila nueva");

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("properties")
    .select("name, rating")
    .eq("id", first)
    .single();

  assert.equal(error, null);
  assert.equal(data.name, "F6-02 Test Hotel (renamed)");
  assert.equal(data.rating, 4.8);

  const { count } = await service
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("provider_name", TEST_PROPERTY.providerName)
    .eq("provider_property_id", TEST_PROPERTY.providerPropertyId);
  assert.equal(count, 1);

  await cleanup(TEST_PROPERTY.providerPropertyId);
});

test("un cliente anon no puede insertar en properties (sin GRANT para anon)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("properties").insert({
    provider_name: "f602_test_provider",
    provider_property_id: "anon-attempt",
    name: "Anon Attempt",
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});

test("service_role NO tiene GRANT de DELETE sobre properties (alcance mínimo de la migración F6-02)", async () => {
  const id = await upsertPropertyCache(TEST_PROPERTY);
  const service = createServiceRoleClient();

  const { error } = await service.from("properties").delete().eq("id", id);

  assert.ok(
    error,
    "se esperaba que Postgres rechazara el DELETE: la migración 20260818070000 concede únicamente INSERT+UPDATE",
  );

  await cleanup(TEST_PROPERTY.providerPropertyId);
});
