// Hotelbeds — tests de mappers.ts. Todas las funciones son puras, sin
// red ni credenciales. Cubre explícitamente los casos de "campo
// ausente en la respuesta de Hotelbeds -> no se inventa" (regla
// explícita de este bloque).

import { test } from "node:test";
import assert from "node:assert/strict";

import type { HotelbedsRawHotel } from "./availability";
import type { CachedPropertyContent } from "../properties/get-cached-properties";
import type { Property } from "../../types/travel";
import {
  findCheapestRate,
  mapHotelbedsHotelToAvailability,
  mapHotelbedsHotelToConditions,
  mapHotelbedsHotelToPriceQuote,
  mapHotelbedsHotelToProperty,
  mergePropertyWithCache,
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

// ── mergePropertyWithCache (FASE 2, bloque "Search ↔ properties") ──

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    providerName: "hotelbeds",
    providerPropertyId: "12345",
    name: "Hotel de Prueba",
    city: "Madrid",
    country: undefined,
    latitude: 40.4168,
    longitude: -3.7038,
    mainPhotoUrl: undefined,
    rating: undefined,
    ...overrides,
  };
}

// Casos A/B del bloque: valores reales de los 2 hoteles ya sincronizados.
test("mergePropertyWithCache: hotel 3424 (As Americas) recibe mainPhotoUrl de la caché", () => {
  const property = makeProperty({ providerPropertyId: "3424", name: "As Americas", city: "AVEIRO" });
  const cache: CachedPropertyContent = {
    mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg",
    country: "PT",
    city: "AVEIRO",
    latitude: 40.6444523509645,
    longitude: -8.64594072098043,
  };

  const merged = mergePropertyWithCache(property, cache);

  assert.equal(merged.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg");
  assert.equal(merged.country, "PT");
});

test("mergePropertyWithCache: hotel 168 (Eurostars Marivent) recibe mainPhotoUrl de la caché", () => {
  const property = makeProperty({ providerPropertyId: "168", name: "Eurostars Marivent", city: "CALA MAYOR" });
  const cache: CachedPropertyContent = {
    mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg",
    country: "ES",
    city: "CALA MAYOR",
    latitude: 39.5526831653502,
    longitude: 2.61092998087406,
  };

  const merged = mergePropertyWithCache(property, cache);

  assert.equal(merged.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg");
  assert.equal(merged.country, "ES");
});

// Caso C: sin caché para este hotel, el Property de Availability sigue funcionando tal cual.
test("mergePropertyWithCache: cache=undefined devuelve el property de Availability sin ningún cambio", () => {
  const property = makeProperty();
  assert.deepEqual(mergePropertyWithCache(property, undefined), property);
});

// Caso G: el merge nunca borra un dato real de Availability con un campo ausente en la caché.
test("mergePropertyWithCache: un campo ausente en la caché (undefined) NUNCA sobrescribe el valor ya presente en Availability", () => {
  const property = makeProperty({ city: "Madrid (Availability)", latitude: 40.4168, longitude: -3.7038 });
  const cache: CachedPropertyContent = { mainPhotoUrl: "https://photos.hotelbeds.com/x.jpg" };

  const merged = mergePropertyWithCache(property, cache);

  assert.equal(merged.city, "Madrid (Availability)");
  assert.equal(merged.latitude, 40.4168);
  assert.equal(merged.longitude, -3.7038);
  assert.equal(merged.mainPhotoUrl, "https://photos.hotelbeds.com/x.jpg");
});

test("mergePropertyWithCache: no toca ningún campo fuera de mainPhotoUrl/country/city/latitude/longitude (name/providerPropertyId/rating intactos)", () => {
  const property = makeProperty({ rating: undefined });
  const cache: CachedPropertyContent = { mainPhotoUrl: "https://photos.hotelbeds.com/x.jpg" };

  const merged = mergePropertyWithCache(property, cache);

  assert.equal(merged.providerName, property.providerName);
  assert.equal(merged.providerPropertyId, property.providerPropertyId);
  assert.equal(merged.name, property.name);
  assert.equal(merged.rating, property.rating);
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
