// Hotelbeds — tests puros de fetchHotelbedsContent(): solo construcción
// de la petición (path/query string) vía un transport inyectado (falso),
// nunca red real. Mismo criterio que lib/hotelbeds/availability.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchHotelbedsContent, type HotelbedsContentResponse } from "./content";
import type { HotelbedsContentHttpResult } from "./content-http";

test("fetchHotelbedsContent: construye codes separados por comas, language y fields=all en la query string", async () => {
  let capturedPath: string | undefined;
  const fakeTransport = async (
    path: string,
  ): Promise<HotelbedsContentHttpResult<HotelbedsContentResponse>> => {
    capturedPath = path;
    return { outcome: "success", httpStatus: 200, body: { hotels: [] } };
  };

  await fetchHotelbedsContent({ hotelCodes: [3424, 168], language: "CAS" }, fakeTransport);

  assert.ok(capturedPath);
  assert.match(capturedPath!, /^\/hotel-content-api\/1\.0\/hotels\?/);
  const query = new URL(`https://example.test${capturedPath}`).searchParams;
  assert.equal(query.get("codes"), "3424,168");
  assert.equal(query.get("language"), "CAS");
  assert.equal(query.get("fields"), "all");
});

test("fetchHotelbedsContent: un único código de hotel también funciona (sin coma sobrante)", async () => {
  let capturedPath: string | undefined;
  const fakeTransport = async (
    path: string,
  ): Promise<HotelbedsContentHttpResult<HotelbedsContentResponse>> => {
    capturedPath = path;
    return { outcome: "success", httpStatus: 200, body: { hotels: [] } };
  };

  await fetchHotelbedsContent({ hotelCodes: [3424], language: "CAS" }, fakeTransport);

  const query = new URL(`https://example.test${capturedPath}`).searchParams;
  assert.equal(query.get("codes"), "3424");
});

test("fetchHotelbedsContent: propaga el resultado del transport tal cual (sin transformarlo)", async () => {
  const fakeResult: HotelbedsContentHttpResult<HotelbedsContentResponse> = {
    outcome: "http_error",
    httpStatus: 403,
    body: { error: "forbidden" },
  };
  const result = await fetchHotelbedsContent(
    { hotelCodes: [168], language: "CAS" },
    async () => fakeResult,
  );

  assert.deepEqual(result, fakeResult);
});
