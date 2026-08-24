// FPR-HOTELS-02 — Tests de upsert-destination-cache.ts contra Supabase
// local real (no un mock) — mismo criterio que
// upsert-property-cache.test.ts.
//
// Sin limpieza por DELETE: `service_role` no tiene GRANT de DELETE sobre
// `destinations` (mismo criterio que `properties` — un caché sincronizado
// nunca se borra desde la app, solo se refresca; verificado empíricamente
// al escribir este bloque: un intento de limpieza vía DELETE fallaba en
// silencio, sin grant, dejando falsos negativos de aislamiento entre
// tests). Cada test usa un `code` único (timestamp + random) para no
// necesitar limpieza — mismo patrón que `create-booking-record.test.ts`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { upsertDestinationCache } from "./upsert-destination-cache";
import type { HotelbedsDestination } from "../hotelbeds/destinations-mappers";

function makeDestination(overrides: Partial<HotelbedsDestination> = {}): HotelbedsDestination {
  const code = overrides.code ?? `fprh02-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    code,
    name: "Barcelona",
    countryCode: "ES",
    raw: { code, name: { content: "Barcelona" } },
    ...overrides,
  };
}

test("upsertDestinationCache: crea la fila con los datos correctos", async () => {
  const destination = makeDestination();
  const rowId = await upsertDestinationCache("fprh02_test", destination);
  assert.ok(rowId);

  const service = createServiceRoleClient();
  const { data, error } = await service.from("destinations").select("*").eq("id", rowId).single();
  assert.equal(error, null);
  assert.equal(data.provider_name, "fprh02_test");
  assert.equal(data.code, destination.code);
  assert.equal(data.name, "Barcelona");
  assert.equal(data.country_code, "ES");
  assert.deepEqual(data.raw_data, destination.raw);
  assert.ok(data.synced_at);
});

test("upsertDestinationCache: llamar dos veces con el mismo code actualiza la misma fila, no duplica", async () => {
  const destination = makeDestination({ name: "Barcelona" });
  const firstId = await upsertDestinationCache("fprh02_test", destination);
  const secondId = await upsertDestinationCache("fprh02_test", { ...destination, name: "Barcelona (actualizado)" });

  assert.equal(firstId, secondId, "el upsert debe devolver el mismo id de fila, no crear una nueva");

  const service = createServiceRoleClient();
  const { data, error } = await service.from("destinations").select("name").eq("id", firstId).single();
  assert.equal(error, null);
  assert.equal(data.name, "Barcelona (actualizado)");

  const { count } = await service
    .from("destinations")
    .select("id", { count: "exact", head: true })
    .eq("provider_name", "fprh02_test")
    .eq("code", destination.code);
  assert.equal(count, 1, "no debe haber más de una fila para el mismo provider_name+code");
});

test("upsertDestinationCache: synced_at avanza en cada re-sync", async () => {
  const destination = makeDestination();
  await upsertDestinationCache("fprh02_test", destination);
  const service = createServiceRoleClient();
  const { data: first } = await service.from("destinations").select("synced_at").eq("provider_name", "fprh02_test").eq("code", destination.code).single();
  assert.ok(first);

  await new Promise((resolve) => setTimeout(resolve, 20));
  await upsertDestinationCache("fprh02_test", destination);
  const { data: second } = await service.from("destinations").select("synced_at").eq("provider_name", "fprh02_test").eq("code", destination.code).single();
  assert.ok(second);

  assert.ok(new Date(second.synced_at).getTime() > new Date(first.synced_at).getTime());
});

// ── RLS/GRANT: ni anon ni authenticated pueden insertar directamente (Patrón B) ──
test("un cliente anon no puede insertar en destinations (sin GRANT ni policy)", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(supabaseUrl && anonKey, "faltan variables de entorno de test");

  const { createClient } = await import("@supabase/supabase-js");
  const anonClient = createClient(supabaseUrl!, anonKey!);

  const { error } = await anonClient.from("destinations").insert({
    provider_name: "fprh02_test",
    code: "ANON-TEST",
    name: "Anon Test",
    country_code: "ES",
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});
