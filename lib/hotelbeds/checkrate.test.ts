// Hotelbeds — tests de checkrate.ts. `transport` FALSO inyectado (nunca
// postHotelbeds real) — mismo criterio que availability.test.ts: `npm
// test` nunca llama a Hotelbeds real ni gasta cuota de sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHotelbedsCheckRateRequestBody,
  fetchHotelbedsCheckRate,
  type HotelbedsCheckRateResponse,
} from "./checkrate";
import type { HotelbedsHttpResult } from "./http";

// ── buildHotelbedsCheckRateRequestBody ──

test("buildHotelbedsCheckRateRequestBody: un único rateKey produce { rooms: [{ rateKey }] } (forma real confirmada en FPR-04.1)", () => {
  const body = buildHotelbedsCheckRateRequestBody(["RATE-KEY-1"]);
  assert.deepEqual(body, { rooms: [{ rateKey: "RATE-KEY-1" }] });
});

test("buildHotelbedsCheckRateRequestBody: varios rateKeys producen una entrada por cada uno, en el mismo orden", () => {
  const body = buildHotelbedsCheckRateRequestBody(["A", "B"]);
  assert.deepEqual(body, { rooms: [{ rateKey: "A" }, { rateKey: "B" }] });
});

// ── fetchHotelbedsCheckRate (transport inyectado, sin red) ──

test("fetchHotelbedsCheckRate: llama al transport con la ruta y el cuerpo correctos", async () => {
  let capturedPath: string | undefined;
  let capturedBody: unknown;
  const fakeTransport = async (
    path: string,
    body: unknown,
  ): Promise<HotelbedsHttpResult<HotelbedsCheckRateResponse>> => {
    capturedPath = path;
    capturedBody = body;
    return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
  };

  const result = await fetchHotelbedsCheckRate(["RATE-KEY-X"], fakeTransport);

  assert.equal(capturedPath, "/hotel-api/1.0/checkrates");
  assert.deepEqual(capturedBody, { rooms: [{ rateKey: "RATE-KEY-X" }] });
  assert.equal(result.outcome, "success");
});

test("fetchHotelbedsCheckRate: propaga tal cual un resultado de error del transport", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsCheckRateResponse>> => ({
    outcome: "missing_certificate",
    message: "Certificado cliente de Hotelbeds no disponible.",
  });

  const result = await fetchHotelbedsCheckRate(["RATE-KEY-X"], fakeTransport);

  assert.equal(result.outcome, "missing_certificate");
});
