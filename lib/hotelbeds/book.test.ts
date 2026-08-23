// Hotelbeds — tests de book.ts. `transport` FALSO inyectado (nunca
// postHotelbeds real) — mismo criterio que checkrate.test.ts: `npm test`
// nunca llama a Hotelbeds real ni gasta cuota de sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchHotelbedsBooking, type HotelbedsBookingResponseEnvelope } from "./book";
import type { HotelbedsBookingRQ } from "./booking";
import type { HotelbedsHttpResult } from "./http";

const SAMPLE_BOOKING_RQ: HotelbedsBookingRQ = {
  holder: { name: "Juan", surname: "Perez" },
  rooms: [{ rateKey: "RATE-KEY-1", paxes: [{ roomId: 1, type: "AD" }] }],
  clientReference: "abc123",
};

test("fetchHotelbedsBooking: llama al transport con la ruta y el bookingRQ exactos, sin transformarlo", async () => {
  let capturedPath: string | undefined;
  let capturedBody: unknown;
  const fakeTransport = async (
    path: string,
    body: unknown,
  ): Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> => {
    capturedPath = path;
    capturedBody = body;
    return { outcome: "success", httpStatus: 200, body: { booking: { reference: "REF-1", status: "CONFIRMED" } } };
  };

  const result = await fetchHotelbedsBooking(SAMPLE_BOOKING_RQ, fakeTransport);

  assert.equal(capturedPath, "/hotel-api/1.0/bookings");
  assert.deepEqual(capturedBody, SAMPLE_BOOKING_RQ);
  assert.equal(result.outcome, "success");
});

test("fetchHotelbedsBooking: propaga tal cual un resultado de éxito con el booking completo", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> => ({
    outcome: "success",
    httpStatus: 200,
    body: { booking: { reference: "REF-1", cancellationReference: "CAN-1", status: "CONFIRMED", totalNet: "100.00", currency: "EUR" } },
  });

  const result = await fetchHotelbedsBooking(SAMPLE_BOOKING_RQ, fakeTransport);

  assert.equal(result.outcome, "success");
  if (result.outcome === "success") {
    assert.deepEqual(result.body.booking, {
      reference: "REF-1",
      cancellationReference: "CAN-1",
      status: "CONFIRMED",
      totalNet: "100.00",
      currency: "EUR",
    });
  }
});

test("fetchHotelbedsBooking: propaga tal cual un resultado de error del transport (http_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> => ({
    outcome: "http_error",
    httpStatus: 400,
    body: { error: "RATE_STALE" },
  });

  const result = await fetchHotelbedsBooking(SAMPLE_BOOKING_RQ, fakeTransport);

  assert.equal(result.outcome, "http_error");
  if (result.outcome === "http_error") {
    assert.equal(result.httpStatus, 400);
  }
});

test("fetchHotelbedsBooking: propaga tal cual un resultado de error del transport (network_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> => ({
    outcome: "network_error",
    message: "Error de red desconocido al llamar a Hotelbeds.",
  });

  const result = await fetchHotelbedsBooking(SAMPLE_BOOKING_RQ, fakeTransport);

  assert.equal(result.outcome, "network_error");
});
