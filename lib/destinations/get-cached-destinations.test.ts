// FPR-HOTELS-02 — Tests de get-cached-destinations.ts contra Supabase
// local real (no un mock) — mismo criterio que get-cached-properties.ts
// (que no tiene test dedicado propio: se prueba indirectamente vía
// search.test.ts del provider; aquí sí se prueba directamente porque el
// resolver Y el autocomplete dependen de esta lectura).
//
// Sin limpieza por DELETE: `service_role` no tiene GRANT de DELETE sobre
// `destinations` (mismo criterio que `properties` — un caché sincronizado
// nunca se borra desde la app, solo se refresca). Cada test usa un
// `provider_name` único (timestamp + random) para que las filas de una
// ejecución nunca interfieran con otra — mismo patrón ya establecido en
// `create-booking-record.test.ts`/`upsert-property-cache.ts` (datos de
// prueba que se acumulan sin riesgo, nunca se intenta un DELETE que no
// está concedido).
import { test } from "node:test";
import assert from "node:assert/strict";

import { upsertDestinationCache } from "./upsert-destination-cache";
import { getCachedDestinations } from "./get-cached-destinations";

function uniqueProvider(tag: string): string {
  return `fprh02-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test("getCachedDestinations: devuelve el catálogo completo de un provider, ordenado por nombre", async () => {
  const provider = uniqueProvider("full-catalog");
  await upsertDestinationCache(provider, { code: "MAD", name: "Madrid", countryCode: "ES", raw: { code: "X" } });
  await upsertDestinationCache(provider, { code: "BCN", name: "Barcelona", countryCode: "ES", raw: { code: "X" } });

  const catalog = await getCachedDestinations(provider);
  assert.equal(catalog.length, 2);
  assert.deepEqual(
    catalog.map((d) => d.code),
    ["BCN", "MAD"],
    "orden alfabético por nombre",
  );
  assert.deepEqual(catalog[0], { code: "BCN", name: "Barcelona", countryCode: "ES" });
});

test("getCachedDestinations: provider sin ningún destino sincronizado -> array vacío, nunca lanza", async () => {
  const catalog = await getCachedDestinations(uniqueProvider("nonexistent"));
  assert.deepEqual(catalog, []);
});

test("getCachedDestinations: no mezcla destinos de otro provider_name", async () => {
  const provider = uniqueProvider("no-mix-own");
  const otherProvider = uniqueProvider("no-mix-other");

  await upsertDestinationCache(provider, { code: "BCN", name: "Barcelona", countryCode: "ES", raw: { code: "X" } });
  await upsertDestinationCache(otherProvider, { code: "BCN", name: "Barcelona (otro provider)", countryCode: "ES", raw: { code: "X" } });

  const catalog = await getCachedDestinations(provider);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].name, "Barcelona");
});
