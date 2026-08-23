// Hotelbeds — tests de lib/hotelbeds/booking.ts. Todo puro: sin red, sin
// Supabase, sin credenciales, sin postHotelbeds(). Mismo criterio que el
// resto de mappers de Hotelbeds (mappers.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH,
  mapBookingRequestToHotelbedsBookingRQ,
  mapHotelbedsBookingResponseToBookingResult,
  mapHotelbedsBookingStatus,
  parseHotelbedsMonetaryAmount,
} from "./booking";
import type { BookingRequest } from "../../types/travel";

const RATE_KEY =
  "20260910|20260912|W|59|3424|TWN.ST|NRF BB|BB||1~2~0||N@07~~23c111~-521985809~N~~~NRF~~D2483FFF8DB146D178721586541205AAUK00020000000006220f3";
const CLIENT_REF = "VIAO-TEST-12345"; // 15 caracteres, <=20

function makeRequest(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    providerPropertyId: "3424",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    guests: 2,
    rooms: 1,
    holder: { name: "HolderFirstName", surname: "HolderLastName" },
    paxes: [
      { roomId: 1, type: "AD" },
      { roomId: 1, type: "AD" },
    ],
    ...overrides,
  };
}

// ── mapBookingRequestToHotelbedsBookingRQ ──

// Test 1
test("Test 1 — 1 habitación, 2 adultos: produce 2 paxes con roomId=1 y type=AD", () => {
  const result = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.body.rooms.length, 1);
  assert.equal(result.body.rooms[0].rateKey, RATE_KEY);
  assert.deepEqual(
    result.body.rooms[0].paxes.map((p) => ({ roomId: p.roomId, type: p.type })),
    [
      { roomId: 1, type: "AD" },
      { roomId: 1, type: "AD" },
    ],
  );
});

// Test 2
test("Test 2 — 2 habitaciones, 4 huéspedes (1,1,2,2): conserva exactamente esa distribución", () => {
  const request = makeRequest({
    guests: 4,
    rooms: 2,
    paxes: [
      { roomId: 1, type: "AD" },
      { roomId: 1, type: "AD" },
      { roomId: 2, type: "AD" },
      { roomId: 2, type: "AD" },
    ],
  });

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.deepEqual(
    result.body.rooms[0].paxes.map((p) => p.roomId),
    [1, 1, 2, 2],
  );
});

// Test 3
test("Test 3 — niño con age: se serializa correctamente", () => {
  const request = makeRequest({
    guests: 1,
    rooms: 1,
    paxes: [{ roomId: 1, type: "CH", name: "Niño", surname: "Apellido", age: 8 }],
  });

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.deepEqual(result.body.rooms[0].paxes[0], {
    roomId: 1,
    type: "CH",
    name: "Niño",
    surname: "Apellido",
    age: 8,
  });
});

// Test 4
test("Test 4 — niño sin age: falla validación (missing_child_age)", () => {
  const request = makeRequest({
    guests: 1,
    rooms: 1,
    paxes: [{ roomId: 1, type: "CH" }],
  });

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "missing_child_age");
});

// Test 5
test("Test 5 — paxes.length !== guests: falla validación (paxes_count_mismatch)", () => {
  const request = makeRequest({ guests: 3 }); // makeRequest ya trae 2 paxes

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "paxes_count_mismatch");
});

// Test 6
test("Test 6 — roomId fuera de rango: falla validación (invalid_room_id), nunca se redistribuye", () => {
  const request = makeRequest({
    rooms: 1,
    paxes: [
      { roomId: 1, type: "AD" },
      { roomId: 2, type: "AD" }, // fuera de rango: rooms=1
    ],
  });

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "invalid_room_id");
  if (result.error.code === "invalid_room_id") {
    assert.equal(result.error.roomId, 2);
  }
});

// Test 7
test("Test 7 — holder se mapea correctamente (name/surname)", () => {
  const request = makeRequest({ holder: { name: "Andrés", surname: "Ramírez" } });

  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.deepEqual(result.body.holder, { name: "Andrés", surname: "Ramírez" });
});

// Test 8
test("Test 8 — rateKey llega exactamente igual al bookingRQ", () => {
  const result = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, CLIENT_REF);

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.body.rooms[0].rateKey, RATE_KEY);
});

// Test 9
test("Test 9 — clientReference de exactamente 20 caracteres: se acepta", () => {
  const clientRef20 = "A".repeat(HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH);
  assert.equal(clientRef20.length, 20);

  const result = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, clientRef20);

  assert.equal(result.outcome, "success");
});

// Test 10
test("Test 10 — clientReference de 21 caracteres: se rechaza (client_reference_too_long)", () => {
  const clientRef21 = "A".repeat(HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH + 1);

  const result = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, clientRef21);

  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "client_reference_too_long");
  if (result.error.code === "client_reference_too_long") {
    assert.equal(result.error.length, 21);
  }
});

test("mapBookingRequestToHotelbedsBookingRQ: sin holder, falla validación (missing_holder)", () => {
  const request = makeRequest({ holder: undefined });
  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);
  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "missing_holder");
});

test("mapBookingRequestToHotelbedsBookingRQ: sin paxes, falla validación (missing_paxes)", () => {
  const request = makeRequest({ paxes: undefined });
  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);
  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "missing_paxes");
});

test("mapBookingRequestToHotelbedsBookingRQ: rooms=0, falla validación (rooms_below_minimum)", () => {
  const request = makeRequest({ rooms: 0, paxes: [] });
  const result = mapBookingRequestToHotelbedsBookingRQ(request, RATE_KEY, CLIENT_REF);
  assert.equal(result.outcome, "validation_error");
  if (result.outcome !== "validation_error") return;
  assert.equal(result.error.code, "rooms_below_minimum");
});

test("mapBookingRequestToHotelbedsBookingRQ: ningún resultado contiene paymentData/tarjeta/cvv en ninguna forma", () => {
  const result = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, CLIENT_REF);
  assert.equal(result.outcome, "success");
  const serialized = JSON.stringify(result);
  for (const forbidden of ["paymentData", "paymentCard", "cardNumber", "cardCVC", "cvv", "expiryDate"]) {
    assert.ok(!serialized.includes(forbidden), `no debería aparecer "${forbidden}" en el resultado`);
  }
});

// ── mapHotelbedsBookingStatus / mapHotelbedsBookingResponseToBookingResult ──

// Test 11
test("Test 11 — PRECONFIRMED produce 'pending'", () => {
  const result = mapHotelbedsBookingStatus("PRECONFIRMED");
  assert.deepEqual(result, { outcome: "success", status: "pending" });
});

// Test 12
test("Test 12 — CONFIRMED produce 'confirmed'", () => {
  const result = mapHotelbedsBookingStatus("CONFIRMED");
  assert.deepEqual(result, { outcome: "success", status: "confirmed" });
});

// Test 13
test("Test 13 — CANCELLED produce 'cancelled'", () => {
  const result = mapHotelbedsBookingStatus("CANCELLED");
  assert.deepEqual(result, { outcome: "success", status: "cancelled" });
});

test("mapHotelbedsBookingStatus: un valor desconocido falla explícitamente (unknown_status), nunca inventa un mapeo", () => {
  const result = mapHotelbedsBookingStatus("SOME_NEW_STATUS_HOTELBEDS_NEVER_DOCUMENTED");
  assert.deepEqual(result, { outcome: "unknown_status", rawStatus: "SOME_NEW_STATUS_HOTELBEDS_NEVER_DOCUMENTED" });
});

// Test 14
test("Test 14 — totalNet: '243.32' (string, formato real confirmado en FPR-04.1) produce providerCost=243.32 y amount=243.32", () => {
  const result = mapHotelbedsBookingResponseToBookingResult({
    reference: "123-12345678",
    status: "CONFIRMED",
    totalNet: "243.32",
    currency: "EUR",
  });

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.providerCost, 243.32);
  assert.equal(result.result.amount, 243.32);
  assert.equal(result.result.currency, "EUR");
});

test("mapHotelbedsBookingResponseToBookingResult: totalNet como number también funciona", () => {
  const result = mapHotelbedsBookingResponseToBookingResult({
    status: "CONFIRMED",
    totalNet: 457.62,
    currency: "EUR",
  });
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.providerCost, 457.62);
});

test("mapHotelbedsBookingResponseToBookingResult: totalNet ausente/inválido nunca se convierte a 0, queda undefined", () => {
  assert.equal(parseHotelbedsMonetaryAmount(undefined), undefined);
  assert.equal(parseHotelbedsMonetaryAmount(""), undefined);
  assert.equal(parseHotelbedsMonetaryAmount("no-es-un-numero"), undefined);

  const result = mapHotelbedsBookingResponseToBookingResult({ status: "CONFIRMED", currency: "EUR" });
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.providerCost, undefined);
  assert.equal(result.result.amount, undefined);
});

// Test 15
test("Test 15 — commission/sellingRate ausentes en la respuesta real: BookingResult nunca inventa un valor de comisión", () => {
  const result = mapHotelbedsBookingResponseToBookingResult({
    reference: "123-12345678",
    status: "CONFIRMED",
    totalNet: "243.32",
    currency: "EUR",
    // Deliberadamente sin `commission`/`sellingRate` — HotelbedsRawBooking
    // ni siquiera los modela (FPR-04.1: ausentes en la cuenta real).
  });

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.ok(!("commission" in result.result));
  assert.ok(!("sellingRate" in result.result));
});

test("mapHotelbedsBookingResponseToBookingResult: conserva cancellationReference cuando Hotelbeds la devuelve", () => {
  const result = mapHotelbedsBookingResponseToBookingResult({
    reference: "1-3816248",
    cancellationReference: "PPFPPJXXVZ",
    status: "CANCELLED",
    totalNet: "0.00",
    currency: "EUR",
  });

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.providerCancellationReference, "PPFPPJXXVZ");
  assert.equal(result.result.status, "cancelled");
});

test("mapHotelbedsBookingResponseToBookingResult: sin cancellationReference (reserva normal, no cancelada), queda undefined", () => {
  const result = mapHotelbedsBookingResponseToBookingResult({
    reference: "123-12345678",
    status: "CONFIRMED",
    totalNet: "243.32",
    currency: "EUR",
  });

  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.providerCancellationReference, undefined);
});

// Test 16
test("Test 16 — ningún mapper de este archivo produce paymentData/tarjeta/CVV en ninguna forma", () => {
  const requestResult = mapBookingRequestToHotelbedsBookingRQ(makeRequest(), RATE_KEY, CLIENT_REF);
  const responseResult = mapHotelbedsBookingResponseToBookingResult({
    reference: "123-12345678",
    status: "CONFIRMED",
    totalNet: "243.32",
    currency: "EUR",
  });

  const serialized = JSON.stringify({ requestResult, responseResult });
  for (const forbidden of ["paymentData", "paymentCard", "cardNumber", "cardCVC", "cvv", "expiryDate", "webPartner"]) {
    assert.ok(!serialized.includes(forbidden), `no debería aparecer "${forbidden}" en ningún resultado de este módulo`);
  }
});
