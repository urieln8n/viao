// FPR-HOTELS-02 — Tests de resolveHotelbedsDestinationCodeByName contra
// Supabase local real (no un mock) — consulta getCachedDestinations
// (lib/destinations/get-cached-destinations.ts), que sí toca Supabase.
//
// Nombres de destino FALSOS (nunca "Barcelona"/"Madrid" reales): este
// archivo escribe bajo `provider_name="hotelbeds"` (el resolver lo tiene
// hardcodeado, igual que `getCachedProperties("hotelbeds", ...)`), el
// MISMO namespace que un sync real (lib/hotelbeds/sync-destinations.ts)
// puede poblar con destinos reales en la misma base — usar un nombre real
// aquí arriesgaría una colisión de `name` con una fila real sincronizada
// (orden de desempate no garantizado). `code` sí es único
// (`FPRH02TEST-...`, timestamp+random), evitando también la colisión de
// la constraint `(provider_name, code)`.
//
// Sin limpieza por DELETE: `service_role` no tiene GRANT de DELETE sobre
// `destinations` (mismo criterio queupsert-destination-cache.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";

import { upsertDestinationCache } from "../destinations/upsert-destination-cache";
import { resolveHotelbedsDestinationCodeByName } from "./hotelbeds-destination-resolver";

function uniqueFakeDestination(tag: string): { code: string; name: string } {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { code: `FPRH02TEST-${tag}-${suffix}`, name: `FPRH02 Test City ${tag} ${suffix}` };
}

test("resolveHotelbedsDestinationCodeByName: encuentra el code exacto para un nombre real del catálogo", async () => {
  const fake = uniqueFakeDestination("A");
  await upsertDestinationCache("hotelbeds", { code: fake.code, name: fake.name, countryCode: "ES", raw: { code: fake.code } });

  const code = await resolveHotelbedsDestinationCodeByName(fake.name);
  assert.equal(code, fake.code);
});

test("resolveHotelbedsDestinationCodeByName: coincidencia case-insensitive", async () => {
  const fake = uniqueFakeDestination("B");
  await upsertDestinationCache("hotelbeds", { code: fake.code, name: fake.name, countryCode: "ES", raw: { code: fake.code } });

  assert.equal(await resolveHotelbedsDestinationCodeByName(fake.name.toLowerCase()), fake.code);
  assert.equal(await resolveHotelbedsDestinationCodeByName(fake.name.toUpperCase()), fake.code);
  assert.equal(await resolveHotelbedsDestinationCodeByName(`  ${fake.name}  `), fake.code);
});

test("resolveHotelbedsDestinationCodeByName: nombre sin coincidencia exacta -> undefined (nunca fuzzy)", async () => {
  const fake = uniqueFakeDestination("C");
  await upsertDestinationCache("hotelbeds", { code: fake.code, name: fake.name, countryCode: "ES", raw: { code: fake.code } });

  assert.equal(
    await resolveHotelbedsDestinationCodeByName(fake.name.slice(0, 8)),
    undefined,
    "nunca coincide por substring/fuzzy",
  );
  assert.equal(await resolveHotelbedsDestinationCodeByName("Narnia"), undefined);
});

test("resolveHotelbedsDestinationCodeByName: string vacío -> undefined, nunca consulta el catálogo", async () => {
  assert.equal(await resolveHotelbedsDestinationCodeByName(""), undefined);
  assert.equal(await resolveHotelbedsDestinationCodeByName("   "), undefined);
});
