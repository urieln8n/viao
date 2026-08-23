// Hotelbeds — tests de resolve-booking-rate.ts. Transporte FALSO
// inyectado tanto para Availability como para CheckRates — nunca red
// real, nunca Hotelbeds real, y sobre todo: nunca `/bookings` (este
// módulo no lo conoce siquiera).

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveBookableRate } from "./resolve-booking-rate";
import type { HotelbedsAvailabilityResponse, HotelbedsRawHotel, HotelbedsRawRate } from "./availability";
import type { HotelbedsHttpResult } from "./http";

const REQUEST = {
  providerPropertyId: "3424",
  checkIn: "2026-09-10",
  checkOut: "2026-09-12",
  guests: 2,
  rooms: 1,
};

function makeRate(overrides: Partial<HotelbedsRawRate> = {}): HotelbedsRawRate {
  return { rateKey: "RATE-AVAIL-1", rateType: "BOOKABLE", net: "243.32", ...overrides };
}

function makeHotel(rates: HotelbedsRawRate[]): HotelbedsRawHotel {
  return {
    code: 3424,
    name: "As Americas",
    rooms: [{ code: "TWN.ST", name: "Twin Room", rates }],
  };
}

function fakeAvailability(
  hotels: HotelbedsRawHotel[],
): (path: string, body: unknown) => Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>> {
  return async () => ({ outcome: "success", httpStatus: 200, body: { hotels: { hotels } } });
}

// ── TEST 1 — BOOKABLE ──

test("TEST 1 — BOOKABLE: devuelve el rateKey de Availability y NO llama a CheckRates", async () => {
  let checkRateCalls = 0;
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "RATE-BOOKABLE", rateType: "BOOKABLE", net: "100.00" })])]),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
    },
  });

  assert.deepEqual(result, { outcome: "success", rateKey: "RATE-BOOKABLE", rateType: "BOOKABLE" });
  assert.equal(checkRateCalls, 0, "CheckRates NUNCA debe llamarse para una tarifa ya BOOKABLE");
});

// ── TEST 2 — RECHECK llama a CheckRates ──

test("TEST 2 — RECHECK: llama a CheckRates exactamente una vez", async () => {
  let checkRateCalls = 0;
  await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "RATE-RECHECK", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return {
        outcome: "success",
        httpStatus: 200,
        body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "RATE-RECHECK", rateType: "BOOKABLE" })] }] } },
      };
    },
  });

  assert.equal(checkRateCalls, 1);
});

// ── TEST 3 — rateKey exacto enviado a CheckRates ──

test("TEST 3 — CheckRates recibe exactamente el rateKey de Availability, sin modificarlo", async () => {
  let capturedBody: unknown;
  await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "ABC123", rateType: "RECHECK" })])]),
    fetchCheckRate: async (_path, body) => {
      capturedBody = body;
      return {
        outcome: "success",
        httpStatus: 200,
        body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "ABC123", rateType: "BOOKABLE" })] }] } },
      };
    },
  });

  assert.deepEqual(capturedBody, { rooms: [{ rateKey: "ABC123" }] });
});

// ── TEST 4 — RECHECK -> BOOKABLE ──

test("TEST 4 — RECHECK seguido de CheckRates BOOKABLE: resultado final success con rateType BOOKABLE", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "ABC123", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => ({
      outcome: "success",
      httpStatus: 200,
      body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "ABC123", rateType: "BOOKABLE" })] }] } },
    }),
  });

  assert.equal(result.outcome, "success");
  if (result.outcome === "success") {
    assert.equal(result.rateType, "BOOKABLE");
    assert.equal(result.rateKey, "ABC123");
  }
});

// ── TEST 5 — RECHECK -> no BOOKABLE ──

test("TEST 5 — RECHECK seguido de CheckRates con otro rateType: nunca reserva, resultado explícito de no reservable", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "ABC123", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => ({
      outcome: "success",
      httpStatus: 200,
      body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "ABC123", rateType: "RECHECK" })] }] } },
    }),
  });

  assert.equal(result.outcome, "not_bookable_after_checkrate");
  if (result.outcome === "not_bookable_after_checkrate") {
    assert.equal(result.rateType, "RECHECK");
  }
});

// ── TEST 6 — CheckRates cambia el rateKey ──

test("TEST 6 — CheckRates devuelve un rateKey distinto al de Availability: el resultado final usa el de CheckRates", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "A", rateType: "RECHECK" })])]),
    fetchCheckRate: async (_path, body) => {
      assert.deepEqual(body, { rooms: [{ rateKey: "A" }] }, "se le sigue pidiendo el rateKey original a CheckRates");
      return {
        outcome: "success",
        httpStatus: 200,
        body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "B", rateType: "BOOKABLE" })] }] } },
      };
    },
  });

  assert.deepEqual(result, { outcome: "success", rateKey: "B", rateType: "BOOKABLE" });
});

// ── TEST 7 — Availability sin rates ──

test("TEST 7 — Availability sin ninguna tarifa: error controlado, nunca llama a CheckRates", async () => {
  let checkRateCalls = 0;
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([]),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
    },
  });

  assert.equal(result.outcome, "no_rate_found");
  assert.equal(checkRateCalls, 0);
});

// ── TEST 8 — RECHECK sin rateKey válido ──

test("TEST 8 — la tarifa de Availability no tiene rateKey: falla ANTES de CheckRates", async () => {
  let checkRateCalls = 0;
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
    },
  });

  assert.equal(result.outcome, "invalid_rate_key");
  assert.equal(checkRateCalls, 0);
});

// ── TEST 9 — Error de Availability ──

test("TEST 9 — Availability devuelve un error de transporte: se propaga como error de provider existente, nunca llama a CheckRates", async () => {
  let checkRateCalls = 0;
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: async () => ({ outcome: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." }),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
    },
  });

  assert.equal(result.outcome, "availability_missing_credentials");
  assert.equal(checkRateCalls, 0);
});

test("TEST 9b — Availability http_error: se propaga con el status real", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: async () => ({ outcome: "http_error", httpStatus: 401, body: { error: "Request signature verification failed" } }),
  });

  assert.equal(result.outcome, "availability_http_error");
  if (result.outcome === "availability_http_error") {
    assert.equal(result.httpStatus, 401);
  }
});

// ── TEST 10 — Error de CheckRates ──

test("TEST 10 — CheckRates devuelve un error de transporte: resultado controlado, nunca continúa", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "ABC123", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => ({ outcome: "network_error", message: "ECONNRESET" }),
  });

  assert.equal(result.outcome, "checkrate_network_error");
});

test("TEST 10b — CheckRates http_error: se propaga con el status real", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "ABC123", rateType: "RECHECK" })])]),
    fetchCheckRate: async () => ({ outcome: "http_error", httpStatus: 400, body: { error: "INVALID_DATA" } }),
  });

  assert.equal(result.outcome, "checkrate_http_error");
  if (result.outcome === "checkrate_http_error") {
    assert.equal(result.httpStatus, 400);
  }
});

// ── TEST 11 — Nunca llama a /bookings ──

test("TEST 11 — ninguna ruta usada por este módulo es /hotel-api/1.0/bookings, en ningún camino (BOOKABLE ni RECHECK)", async () => {
  const calledPaths: string[] = [];

  await resolveBookableRate(REQUEST, {
    fetchAvailability: async (path: string) => {
      calledPaths.push(path);
      return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [makeHotel([makeRate({ rateKey: "X", rateType: "RECHECK" })])] } } };
    },
    fetchCheckRate: async (path: string) => {
      calledPaths.push(path);
      return {
        outcome: "success",
        httpStatus: 200,
        body: { hotel: { rooms: [{ code: "TWN.ST", name: "Twin Room", rates: [makeRate({ rateKey: "X", rateType: "BOOKABLE" })] }] } },
      };
    },
  });

  assert.deepEqual(calledPaths, ["/hotel-api/1.0/hotels", "/hotel-api/1.0/checkrates"]);
  for (const path of calledPaths) {
    assert.notEqual(path, "/hotel-api/1.0/bookings");
    assert.ok(!path.includes("/bookings"), `ninguna ruta debe contener "/bookings" (encontrado: "${path}")`);
  }
});

// ── extra: hotel de otro código ignorado, rateType desconocido ──

test("resolveBookableRate: ignora hoteles de otro providerPropertyId en la misma respuesta de Availability", async () => {
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([
      makeHotel([makeRate({ rateKey: "OTRO-HOTEL", rateType: "BOOKABLE" })]),
    ].map((h) => ({ ...h, code: 999 }))),
  });

  assert.equal(result.outcome, "no_rate_found");
});

test("resolveBookableRate: rateType desconocido (ni BOOKABLE ni RECHECK) falla explícito, no llama a CheckRates", async () => {
  let checkRateCalls = 0;
  const result = await resolveBookableRate(REQUEST, {
    fetchAvailability: fakeAvailability([makeHotel([makeRate({ rateKey: "X", rateType: "ON_REQUEST" })])]),
    fetchCheckRate: async () => {
      checkRateCalls += 1;
      return { outcome: "success", httpStatus: 200, body: { hotel: { rooms: [] } } };
    },
  });

  assert.equal(result.outcome, "unknown_rate_type");
  if (result.outcome === "unknown_rate_type") {
    assert.equal(result.rateType, "ON_REQUEST");
  }
  assert.equal(checkRateCalls, 0);
});
