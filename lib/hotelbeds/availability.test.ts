// Hotelbeds — tests de availability.ts. `buildOccupancies`/
// `buildHotelbedsAvailabilityRequestBody` son funciones puras (sin red).
// `fetchHotelbedsAvailability` se prueba con un `transport` FALSO
// inyectado (nunca postHotelbeds real) — mismo criterio que el resto del
// proyecto: `npm test` nunca llama a Hotelbeds real ni gasta cuota de
// sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHotelbedsAvailabilityRequestBody,
  buildOccupancies,
  fetchHotelbedsAvailability,
  type HotelbedsAvailabilityResponse,
} from "./availability";
import type { HotelbedsHttpResult } from "./http";

// ── buildOccupancies ──

test("buildOccupancies: reparte los huéspedes de forma uniforme en un único grupo de habitaciones", () => {
  assert.deepEqual(buildOccupancies(4, 2), [{ rooms: 2, adults: 2, children: 0 }]);
});

test("buildOccupancies: redondea hacia arriba cuando los huéspedes no dividen exacto entre habitaciones", () => {
  assert.deepEqual(buildOccupancies(3, 2), [{ rooms: 2, adults: 2, children: 0 }]);
});

test("buildOccupancies: nunca produce 0 adultos por habitación aunque guests sea menor que rooms", () => {
  assert.deepEqual(buildOccupancies(1, 2), [{ rooms: 2, adults: 1, children: 0 }]);
});

// ── buildHotelbedsAvailabilityRequestBody ──

test("buildHotelbedsAvailabilityRequestBody: scope 'destination' produce el campo destination.code, no hotels", () => {
  const body = buildHotelbedsAvailabilityRequestBody({
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    rooms: 1,
    guests: 2,
    scope: { type: "destination", code: "MAD" },
  }) as Record<string, unknown>;

  assert.deepEqual(body.stay, { checkIn: "2026-09-01", checkOut: "2026-09-03" });
  assert.deepEqual(body.occupancies, [{ rooms: 1, adults: 2, children: 0 }]);
  assert.deepEqual(body.destination, { code: "MAD" });
  assert.equal(body.hotels, undefined);
});

test("buildHotelbedsAvailabilityRequestBody: scope 'hotelCodes' produce el campo hotels.hotel, no destination", () => {
  const body = buildHotelbedsAvailabilityRequestBody({
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    rooms: 1,
    guests: 2,
    scope: { type: "hotelCodes", codes: [12345, 678] },
  }) as Record<string, unknown>;

  assert.deepEqual(body.hotels, { hotel: [12345, 678] });
  assert.equal(body.destination, undefined);
});

// ── fetchHotelbedsAvailability (transport inyectado, sin red) ──

test("fetchHotelbedsAvailability: llama al transport con la ruta y el cuerpo correctos", async () => {
  let capturedPath: string | undefined;
  let capturedBody: unknown;
  const fakeTransport = async (
    calledPath: string,
    calledBody: unknown,
  ): Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>> => {
    capturedPath = calledPath;
    capturedBody = calledBody;
    return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [] } } };
  };

  const result = await fetchHotelbedsAvailability(
    {
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      rooms: 1,
      guests: 1,
      scope: { type: "hotelCodes", codes: [1] },
    },
    fakeTransport,
  );

  assert.equal(capturedPath, "/hotel-api/1.0/hotels");
  assert.deepEqual(capturedBody, {
    stay: { checkIn: "2026-09-01", checkOut: "2026-09-03" },
    occupancies: [{ rooms: 1, adults: 1, children: 0 }],
    hotels: { hotel: [1] },
  });
  assert.equal(result.outcome, "success");
});

test("fetchHotelbedsAvailability: propaga tal cual un resultado de error del transport (p. ej. http_error)", async () => {
  const fakeTransport = async (): Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>> => ({
    outcome: "http_error",
    httpStatus: 401,
    body: { error: "Request signature verification failed" },
  });

  const result = await fetchHotelbedsAvailability(
    {
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      rooms: 1,
      guests: 1,
      scope: { type: "destination", code: "MAD" },
    },
    fakeTransport,
  );

  assert.equal(result.outcome, "http_error");
  assert.equal((result as { httpStatus: number }).httpStatus, 401);
});
