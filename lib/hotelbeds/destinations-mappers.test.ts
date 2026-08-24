// Hotelbeds — tests de destinations-mappers.ts. Puro, sin HTTP —
// mismo criterio que content-mappers.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { mapHotelbedsRawDestination, mapHotelbedsRawDestinations } from "./destinations-mappers";
import type { HotelbedsRawDestination } from "./destinations";

test("mapHotelbedsRawDestination: destino completo se mapea correctamente", () => {
  const raw: HotelbedsRawDestination = {
    code: "BCN",
    countryCode: "ES",
    isoCode: "ES",
    name: { content: "Barcelona" },
    zones: [{}, {}],
  };
  const result = mapHotelbedsRawDestination(raw);
  assert.ok(result);
  assert.equal(result!.code, "BCN");
  assert.equal(result!.name, "Barcelona");
  assert.equal(result!.countryCode, "ES");
  assert.deepEqual(result!.raw, raw);
});

test("mapHotelbedsRawDestination: sin code, undefined (nunca inventa uno)", () => {
  const raw = { countryCode: "ES", name: { content: "Barcelona" } } as HotelbedsRawDestination;
  assert.equal(mapHotelbedsRawDestination(raw), undefined);
});

test("mapHotelbedsRawDestination: sin name.content, undefined (nunca usa el code como nombre)", () => {
  const raw: HotelbedsRawDestination = { code: "BCN", countryCode: "ES" };
  assert.equal(mapHotelbedsRawDestination(raw), undefined);
});

test("mapHotelbedsRawDestination: sin countryCode, undefined", () => {
  const raw: HotelbedsRawDestination = { code: "BCN", name: { content: "Barcelona" } };
  assert.equal(mapHotelbedsRawDestination(raw), undefined);
});

test("mapHotelbedsRawDestinations: mapea varios, descartando en silencio los incompletos (nunca aborta el resto)", () => {
  const raws: HotelbedsRawDestination[] = [
    { code: "BCN", countryCode: "ES", name: { content: "Barcelona" } },
    { code: "SIN-NOMBRE", countryCode: "ES" },
    { code: "MAD", countryCode: "ES", name: { content: "Madrid" } },
  ];
  const results = mapHotelbedsRawDestinations(raws);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((d) => d.code), ["BCN", "MAD"]);
});

test("mapHotelbedsRawDestinations: lista vacía -> array vacío", () => {
  assert.deepEqual(mapHotelbedsRawDestinations([]), []);
});
