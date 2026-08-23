// Hotelbeds — tests de cancel.ts. `transport` FALSO inyectado (nunca
// postHotelbeds real) — mismo criterio que book.test.ts/checkrate.test.ts:
// `npm test` nunca llama a Hotelbeds real ni gasta cuota de sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHotelbedsCancellationPath,
  fetchHotelbedsCancellation,
  type HotelbedsCancellationResponseEnvelope,
} from "./cancel";
import type { HotelbedsHttpResult } from "./http";

// ── buildHotelbedsCancellationPath ──

test("buildHotelbedsCancellationPath: incluye el providerBookingReference en la ruta y cancellationFlag=CANCELLATION (nunca SIMULATION)", () => {
  const path = buildHotelbedsCancellationPath("1-3816248");
  assert.equal(path, "/hotel-api/1.0/bookings/1-3816248?cancellationFlag=CANCELLATION");
});

test("buildHotelbedsCancellationPath: codifica el providerBookingReference (encodeURIComponent), nunca lo transforma de otra forma", () => {
  const path = buildHotelbedsCancellationPath("ref with spaces");
  assert.equal(path, "/hotel-api/1.0/bookings/ref%20with%20spaces?cancellationFlag=CANCELLATION");
});

// ── fetchHotelbedsCancellation (transport inyectado, sin red) ──

test("fetchHotelbedsCancellation: llama al transport con la ruta correcta y body undefined (DELETE nunca lleva cuerpo)", async () => {
  let capturedPath: string | undefined;
  let capturedBody: unknown = "not-yet-set";
  const fakeTransport = async (
    path: string,
    body: unknown,
  ): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> => {
    capturedPath = path;
    capturedBody = body;
    return { outcome: "success", httpStatus: 200, body: { booking: { status: "CANCELLED" } } };
  };

  const result = await fetchHotelbedsCancellation("1-3816248", fakeTransport);

  assert.equal(capturedPath, "/hotel-api/1.0/bookings/1-3816248?cancellationFlag=CANCELLATION");
  assert.equal(capturedBody, undefined);
  assert.equal(result.outcome, "success");
});

test("fetchHotelbedsCancellation: propaga tal cual un resultado de éxito con el booking cancelado completo", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> => ({
    outcome: "success",
    httpStatus: 200,
    body: { booking: { cancellationReference: "PPFPPJXXVZ", status: "CANCELLED", hotel: { cancellationAmount: 10 } } },
  });

  const result = await fetchHotelbedsCancellation("1-3816248", fakeTransport);

  assert.equal(result.outcome, "success");
  if (result.outcome === "success") {
    assert.deepEqual(result.body.booking, {
      cancellationReference: "PPFPPJXXVZ",
      status: "CANCELLED",
      hotel: { cancellationAmount: 10 },
    });
  }
});

test("fetchHotelbedsCancellation: propaga tal cual un resultado de error del transport (http_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> => ({
    outcome: "http_error",
    httpStatus: 404,
    body: { error: "BOOKING_NOT_FOUND" },
  });

  const result = await fetchHotelbedsCancellation("does-not-exist", fakeTransport);

  assert.equal(result.outcome, "http_error");
  if (result.outcome === "http_error") {
    assert.equal(result.httpStatus, 404);
  }
});

test("fetchHotelbedsCancellation: propaga tal cual un resultado de error del transport (network_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> => ({
    outcome: "network_error",
    message: "socket hang up",
  });

  const result = await fetchHotelbedsCancellation("1-3816248", fakeTransport);

  assert.equal(result.outcome, "network_error");
});
