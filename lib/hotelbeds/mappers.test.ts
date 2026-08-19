// Hotelbeds — tests de mappers.ts. Todas las funciones son puras, sin
// red ni credenciales. Cubre explícitamente los casos de "campo
// ausente en la respuesta de Hotelbeds -> no se inventa" (regla
// explícita de este bloque).

import { test } from "node:test";
import assert from "node:assert/strict";

import type { HotelbedsRawHotel } from "./availability";
import {
  findCheapestRate,
  mapHotelbedsHotelToAvailability,
  mapHotelbedsHotelToConditions,
  mapHotelbedsHotelToPriceQuote,
  mapHotelbedsHotelToProperty,
} from "./mappers";

function makeHotel(overrides: Partial<HotelbedsRawHotel> = {}): HotelbedsRawHotel {
  return {
    code: 12345,
    name: "Hotel de Prueba",
    categoryCode: "4EST",
    categoryName: "4 STARS",
    destinationCode: "MAD",
    destinationName: "Madrid",
    latitude: "40.4168",
    longitude: "-3.7038",
    currency: "EUR",
    rooms: [
      {
        code: "DBL.ST",
        name: "DOUBLE STANDARD",
        rates: [
          { rateKey: "rk-1", net: "150.00", cancellationPolicies: [{ amount: "75.00", from: "2026-08-30T23:59:00+01:00" }] },
          { rateKey: "rk-2", net: "120.00" },
        ],
      },
    ],
    ...overrides,
  };
}

// ── mapHotelbedsHotelToProperty ──

test("mapHotelbedsHotelToProperty: mapea code/name/city/lat/lng, providerName siempre 'hotelbeds'", () => {
  const property = mapHotelbedsHotelToProperty(makeHotel());
  assert.equal(property.providerName, "hotelbeds");
  assert.equal(property.providerPropertyId, "12345");
  assert.equal(property.name, "Hotel de Prueba");
  assert.equal(property.city, "Madrid");
  assert.equal(property.latitude, 40.4168);
  assert.equal(property.longitude, -3.7038);
});

test("mapHotelbedsHotelToProperty: mainPhotoUrl/country/rating siempre undefined (Content API pendiente / no inventar rating)", () => {
  const property = mapHotelbedsHotelToProperty(makeHotel());
  assert.equal(property.mainPhotoUrl, undefined);
  assert.equal(property.country, undefined);
  assert.equal(property.rating, undefined);
});

test("mapHotelbedsHotelToProperty: sin latitude/longitude en el hotel de Hotelbeds, quedan undefined (no se inventa 0)", () => {
  const property = mapHotelbedsHotelToProperty(makeHotel({ latitude: undefined, longitude: undefined }));
  assert.equal(property.latitude, undefined);
  assert.equal(property.longitude, undefined);
});

test("mapHotelbedsHotelToProperty: conserva el hotel crudo en 'raw'", () => {
  const hotel = makeHotel();
  const property = mapHotelbedsHotelToProperty(hotel);
  assert.deepEqual(property.raw, hotel);
});

// ── findCheapestRate ──

test("findCheapestRate: devuelve la tarifa de menor 'net' entre todas las habitaciones", () => {
  const rate = findCheapestRate(makeHotel());
  assert.equal(rate?.rateKey, "rk-2");
});

test("findCheapestRate: undefined si el hotel no tiene ninguna habitación/tarifa", () => {
  assert.equal(findCheapestRate(makeHotel({ rooms: [] })), undefined);
});

// ── mapHotelbedsHotelToAvailability ──

test("mapHotelbedsHotelToAvailability: available=true si hay al menos una tarifa", () => {
  assert.deepEqual(mapHotelbedsHotelToAvailability(makeHotel()), { available: true });
});

test("mapHotelbedsHotelToAvailability: available=false si el hotel no tiene tarifas", () => {
  assert.deepEqual(mapHotelbedsHotelToAvailability(makeHotel({ rooms: [] })), { available: false });
});

test("mapHotelbedsHotelToAvailability: available=false si el hotel es undefined (no encontrado en la respuesta)", () => {
  assert.deepEqual(mapHotelbedsHotelToAvailability(undefined), { available: false });
});

// ── mapHotelbedsHotelToPriceQuote ──

test("mapHotelbedsHotelToPriceQuote: amount de la tarifa más barata, currency del hotel", () => {
  const quote = mapHotelbedsHotelToPriceQuote(makeHotel());
  assert.deepEqual(quote, { amount: 120, currency: "EUR" });
});

test("mapHotelbedsHotelToPriceQuote: undefined si no hay ninguna tarifa (nunca inventa un precio)", () => {
  assert.equal(mapHotelbedsHotelToPriceQuote(makeHotel({ rooms: [] })), undefined);
});

test("mapHotelbedsHotelToPriceQuote: undefined si el hotel no trae currency, aunque haya tarifas (nunca asume EUR)", () => {
  assert.equal(mapHotelbedsHotelToPriceQuote(makeHotel({ currency: undefined })), undefined);
});

// ── mapHotelbedsHotelToConditions ──

test("mapHotelbedsHotelToConditions: construye cancellationPolicy a partir de la tarifa más barata; requirements siempre undefined", () => {
  // La tarifa más barata (rk-2) no tiene cancellationPolicies en el fixture.
  const conditions = mapHotelbedsHotelToConditions(makeHotel());
  assert.equal(conditions.cancellationPolicy, undefined);
  assert.equal(conditions.requirements, undefined);
});

test("mapHotelbedsHotelToConditions: formatea cancellationPolicies cuando la tarifa más barata sí las tiene", () => {
  const hotel = makeHotel({
    rooms: [
      {
        code: "DBL.ST",
        name: "DOUBLE STANDARD",
        rates: [
          { rateKey: "rk-1", net: "100.00", cancellationPolicies: [{ amount: "50.00", from: "2026-08-30T23:59:00+01:00" }] },
        ],
      },
    ],
  });
  const conditions = mapHotelbedsHotelToConditions(hotel);
  assert.match(conditions.cancellationPolicy ?? "", /50\.00/);
  assert.match(conditions.cancellationPolicy ?? "", /2026-08-30/);
});

test("mapHotelbedsHotelToConditions: objeto vacío si el hotel no tiene ninguna tarifa", () => {
  assert.deepEqual(mapHotelbedsHotelToConditions(makeHotel({ rooms: [] })), {});
});
