// Hotelbeds — tests de destinations.ts. `transport` FALSO inyectado
// (nunca getHotelbedsContent real) — mismo criterio que content.test.ts:
// `npm test` nunca llama a Hotelbeds real ni gasta cuota de sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  fetchHotelbedsDestinations,
  type HotelbedsDestinationsResponse,
} from "./destinations";
import type { HotelbedsContentHttpResult } from "./content-http";

test("fetchHotelbedsDestinations: construye la ruta con countryCodes/language/fields/from/to correctos", async () => {
  let capturedPath: string | undefined;
  const fakeTransport = async (
    path: string,
  ): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => {
    capturedPath = path;
    return { outcome: "success", httpStatus: 200, body: { destinations: [] } };
  };

  await fetchHotelbedsDestinations(
    { countryCodes: ["ES"], language: "CAS", from: 1, to: 1000 },
    fakeTransport,
  );

  assert.equal(
    capturedPath,
    "/hotel-content-api/1.0/locations/destinations?countryCodes=ES&language=CAS&fields=all&from=1&to=1000",
  );
});

test("fetchHotelbedsDestinations: varios countryCodes se unen con comas, en el mismo orden", async () => {
  let capturedPath: string | undefined;
  const fakeTransport = async (
    path: string,
  ): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => {
    capturedPath = path;
    return { outcome: "success", httpStatus: 200, body: { destinations: [] } };
  };

  await fetchHotelbedsDestinations(
    { countryCodes: ["ES", "FR", "IT"], language: "CAS", from: 1, to: 1000 },
    fakeTransport,
  );

  assert.ok(capturedPath?.includes("countryCodes=ES%2CFR%2CIT"));
});

test("fetchHotelbedsDestinations: propaga tal cual un resultado de éxito con destinos reales", async () => {
  const fakeTransport = async (): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => ({
    outcome: "success",
    httpStatus: 200,
    body: {
      from: 1,
      to: 74,
      total: 74,
      destinations: [
        { code: "BCN", countryCode: "ES", isoCode: "ES", name: { content: "Barcelona" }, zones: [] },
        { code: "MAD", countryCode: "ES", isoCode: "ES", name: { content: "Madrid" }, zones: [] },
      ],
    },
  });

  const result = await fetchHotelbedsDestinations(
    { countryCodes: ["ES"], language: "CAS", from: 1, to: 1000 },
    fakeTransport,
  );

  assert.equal(result.outcome, "success");
  if (result.outcome === "success") {
    assert.equal(result.body.total, 74);
    assert.equal(result.body.destinations?.length, 2);
    assert.equal(result.body.destinations?.[0].code, "BCN");
  }
});

test("fetchHotelbedsDestinations: propaga tal cual un resultado de error del transport (http_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => ({
    outcome: "http_error",
    httpStatus: 400,
    body: { error: { code: "INVALID_DATA", message: "The number of elements in response are limited to 1000" } },
  });

  const result = await fetchHotelbedsDestinations(
    { countryCodes: ["ES"], language: "CAS", from: 1, to: 2000 },
    fakeTransport,
  );

  assert.equal(result.outcome, "http_error");
});

test("fetchHotelbedsDestinations: propaga tal cual un resultado de error del transport (missing_credentials)", async () => {
  const fakeTransport = async (): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => ({
    outcome: "missing_credentials",
    message: "HOTELBEDS_API_KEY no está configurada.",
  });

  const result = await fetchHotelbedsDestinations(
    { countryCodes: ["ES"], language: "CAS", from: 1, to: 1000 },
    fakeTransport,
  );

  assert.equal(result.outcome, "missing_credentials");
});
