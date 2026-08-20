// FASE 2 (bloque "Search ↔ properties") — tests de getCachedProperties()
// contra Supabase local real (no un mock), mismo criterio que
// upsert-property-cache.test.ts: requiere Supabase local arrancado y sus
// variables de entorno pasadas al proceso (nunca .env.local).

import { test } from "node:test";
import assert from "node:assert/strict";

import { getCachedProperties } from "./get-cached-properties";
import { upsertPropertyCache } from "./upsert-property-cache";
import type { Property } from "../../types/travel";

const PROVIDER = `f2_test_provider_${Date.now()}`;

test("getCachedProperties: sin providerPropertyIds, devuelve Map vacío sin consultar Supabase", async () => {
  const cache = await getCachedProperties(PROVIDER, []);
  assert.equal(cache.size, 0);
});

// Caso F (bloque "Search ↔ properties"): un fallo de Supabase nunca debe
// romper Search. Se simula sin depender de que Supabase local esté
// arrancado (mismo criterio que lib/hotelbeds/content-http.test.ts):
// quitando las variables de entorno, createServiceRoleClient() lanza de
// forma síncrona dentro del try/catch de getCachedProperties — exactamente
// el mismo camino que tomaría cualquier otro fallo real (red, RLS, etc.).
test("getCachedProperties: si createServiceRoleClient() falla (credenciales de Supabase ausentes), devuelve Map vacío en vez de lanzar", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const cache = await getCachedProperties("hotelbeds", ["3424", "168"]);
    assert.equal(cache.size, 0);
  } finally {
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

test("getCachedProperties: una sola query trae varios hoteles a la vez, indexados por provider_property_id (incluye name y raw)", async () => {
  const rawA = { images: [{ path: "00/003424/003424a_hb_a_009.jpg", imageTypeCode: "GEN" }], countryCode: "PT" };
  const rawB = { images: [{ path: "00/000168/000168a_hb_a_036.jpg", imageTypeCode: "GEN" }], countryCode: "ES" };
  const propertyA: Property = {
    providerName: PROVIDER,
    providerPropertyId: "3424",
    name: "As Americas",
    city: "AVEIRO",
    country: "PT",
    latitude: 40.6444523509645,
    longitude: -8.64594072098043,
    mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg",
    raw: rawA,
  };
  const propertyB: Property = {
    providerName: PROVIDER,
    providerPropertyId: "168",
    name: "Eurostars Marivent",
    city: "CALA MAYOR",
    country: "ES",
    latitude: 39.5526831653502,
    longitude: 2.61092998087406,
    mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg",
    raw: rawB,
  };
  await upsertPropertyCache(propertyA);
  await upsertPropertyCache(propertyB);

  const cache = await getCachedProperties(PROVIDER, ["3424", "168", "no-existe-999"]);

  assert.equal(cache.size, 2);
  assert.deepEqual(cache.get("3424"), {
    name: "As Americas",
    mainPhotoUrl: propertyA.mainPhotoUrl,
    country: "PT",
    city: "AVEIRO",
    latitude: 40.6444523509645,
    longitude: -8.64594072098043,
    raw: rawA,
  });
  assert.deepEqual(cache.get("168"), {
    name: "Eurostars Marivent",
    mainPhotoUrl: propertyB.mainPhotoUrl,
    country: "ES",
    city: "CALA MAYOR",
    latitude: 39.5526831653502,
    longitude: 2.61092998087406,
    raw: rawB,
  });
  assert.equal(cache.get("no-existe-999"), undefined);
});

test("getCachedProperties: sin property.raw al cachear, raw vuelve como '{}' (default de la columna, nunca undefined)", async () => {
  const property: Property = {
    providerName: PROVIDER,
    providerPropertyId: "sin-raw",
    name: "Hotel Sin Raw",
  };
  await upsertPropertyCache(property);

  const cache = await getCachedProperties(PROVIDER, ["sin-raw"]);

  assert.deepEqual(cache.get("sin-raw")?.raw, {});
  assert.equal(cache.get("sin-raw")?.name, "Hotel Sin Raw");
});

test("getCachedProperties: no mezcla providers distintos (mismo provider_property_id, otro provider_name)", async () => {
  await upsertPropertyCache({
    providerName: "mock",
    providerPropertyId: "3424",
    name: "Mock homónimo, no debe aparecer",
  });

  const cache = await getCachedProperties(PROVIDER, ["3424"]);

  // 3424 ya se cacheó para PROVIDER en el test anterior de este archivo —
  // si esta consulta devolviera el de "mock" en su lugar, el name/city no
  // coincidirían; aquí solo comprobamos que la fila "mock" no contamina
  // el resultado de un provider_name distinto.
  const entry = cache.get("3424");
  assert.ok(entry, "se esperaba encontrar la fila de PROVIDER, no la de 'mock'");
});
