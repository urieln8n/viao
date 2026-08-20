// Hotelbeds — tests de syncHotelbedsContent() con TODAS las dependencias
// inyectadas (falsas): sin red real a Hotelbeds, sin Supabase real. Mismo
// criterio que el resto del proyecto — `npm test` nunca debe golpear un
// servicio externo real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { syncHotelbedsContent } from "./sync-content";
import type { HotelbedsContentResponse } from "./content";
import type { HotelbedsContentHttpResult } from "./content-http";
import type { Property } from "../../types/travel";

function fakeSuccessTransport(
  hotels: HotelbedsContentResponse["hotels"],
): (path: string) => Promise<HotelbedsContentHttpResult<HotelbedsContentResponse>> {
  return async () => ({ outcome: "success", httpStatus: 200, body: { hotels } });
}

test("syncHotelbedsContent: sin HOTELBEDS_FIXED_HOTEL_CODES configurado, no llama al transport ni al upsert", async () => {
  let transportCalled = false;
  let upsertCalled = false;

  const result = await syncHotelbedsContent({
    getHotelCodes: () => undefined,
    transport: async () => {
      transportCalled = true;
      return { outcome: "success", httpStatus: 200, body: { hotels: [] } };
    },
    upsert: async () => {
      upsertCalled = true;
      return "unused";
    },
  });

  assert.equal(result.status, "no_hotel_codes_configured");
  assert.equal(transportCalled, false);
  assert.equal(upsertCalled, false);
});

test("syncHotelbedsContent: camino feliz — 2 hoteles, upsert llamado una vez por hotel, resultados con propertyRowId", async () => {
  const upsertedProperties: Property[] = [];

  const result = await syncHotelbedsContent({
    getHotelCodes: () => [3424, 168],
    transport: fakeSuccessTransport([
      {
        code: 168,
        name: { content: "Eurostars Marivent" },
        city: { content: "CALA MAYOR" },
        countryCode: "ES",
        coordinates: { latitude: 39.55, longitude: 2.61 },
        images: [{ imageTypeCode: "GEN", path: "168-main.jpg", visualOrder: 22 }],
      },
      {
        code: 3424,
        name: { content: "As Americas" },
        city: { content: "AVEIRO" },
        countryCode: "PT",
        coordinates: { latitude: 40.64, longitude: -8.65 },
        images: [{ imageTypeCode: "GEN", path: "3424-main.jpg", visualOrder: 6 }],
      },
    ]),
    upsert: async (property) => {
      upsertedProperties.push(property);
      return `row-${property.providerPropertyId}`;
    },
  });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.results.length, 2);
  assert.equal(upsertedProperties.length, 2);

  const hotel3424 = result.results.find((row) => row.hotelCode === 3424);
  assert.equal(hotel3424?.propertyRowId, "row-3424");
  assert.equal(hotel3424?.property.name, "As Americas");
  assert.equal(
    hotel3424?.property.mainPhotoUrl,
    "https://photos.hotelbeds.com/giata/bigger/3424-main.jpg",
  );

  const hotel168 = result.results.find((row) => row.hotelCode === 168);
  assert.equal(hotel168?.propertyRowId, "row-168");
  assert.equal(hotel168?.property.country, "ES");
});

test("syncHotelbedsContent: un hotel configurado que no viene en la respuesta aborta todo el sync (fail closed)", async () => {
  let upsertCallCount = 0;

  const result = await syncHotelbedsContent({
    getHotelCodes: () => [3424, 168],
    transport: fakeSuccessTransport([{ code: 3424, name: { content: "As Americas" } }]),
    upsert: async () => {
      upsertCallCount += 1;
      return "row-x";
    },
  });

  assert.equal(result.status, "hotel_missing_from_response");
  if (result.status === "hotel_missing_from_response") {
    assert.equal(result.hotelCode, 168);
  }
  // El código 3424 sí estaba disponible y se procesa en orden antes que
  // 168 — el abort ocurre al llegar al hotel ausente, no antes.
  assert.equal(upsertCallCount, 1);
});

test("syncHotelbedsContent: propaga missing_credentials/network_error/http_error del transport tal cual, sin llamar al upsert", async () => {
  let upsertCalled = false;
  const upsert = async () => {
    upsertCalled = true;
    return "unused";
  };

  const missingCreds = await syncHotelbedsContent({
    getHotelCodes: () => [168],
    transport: async () => ({ outcome: "missing_credentials", message: "faltan credenciales" }),
    upsert,
  });
  assert.equal(missingCreds.status, "missing_credentials");

  const networkError = await syncHotelbedsContent({
    getHotelCodes: () => [168],
    transport: async () => ({ outcome: "network_error", message: "ECONNRESET" }),
    upsert,
  });
  assert.equal(networkError.status, "network_error");

  const httpError = await syncHotelbedsContent({
    getHotelCodes: () => [168],
    transport: async () => ({ outcome: "http_error", httpStatus: 403, body: { error: "x" } }),
    upsert,
  });
  assert.equal(httpError.status, "http_error");
  if (httpError.status === "http_error") {
    assert.equal(httpError.httpStatus, 403);
  }

  assert.equal(upsertCalled, false);
});
