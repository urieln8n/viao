// Hotelbeds — tests de cancellation.ts. Puro, sin HTTP ni transporte —
// mismo criterio que booking.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mapHotelbedsCancellationResponseToCancellationResult,
  type HotelbedsRawCancellation,
} from "./cancellation";

// ── mapHotelbedsCancellationResponseToCancellationResult ──

test("mapHotelbedsCancellationResponseToCancellationResult: status CANCELLED -> cancelled=true, status='cancelled'", () => {
  const booking: HotelbedsRawCancellation = {
    cancellationReference: "PPFPPJXXVZ",
    status: "CANCELLED",
    hotel: { cancellationAmount: 25.5 },
  };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.deepEqual(result.result, {
    cancelled: true,
    cancellationReference: "PPFPPJXXVZ",
    status: "cancelled",
    cancellationAmount: 25.5,
  });
});

test("mapHotelbedsCancellationResponseToCancellationResult: cancellationAmount como string (tolerante, igual que totalNet en booking.ts)", () => {
  const booking: HotelbedsRawCancellation = {
    cancellationReference: "PPFPPJXXVZ",
    status: "CANCELLED",
    hotel: { cancellationAmount: "25.50" },
  };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.cancellationAmount, 25.5);
});

test("mapHotelbedsCancellationResponseToCancellationResult: sin hotel/cancellationAmount, queda undefined (nunca 0 inventado)", () => {
  const booking: HotelbedsRawCancellation = {
    cancellationReference: "PPFPPJXXVZ",
    status: "CANCELLED",
  };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.cancellationAmount, undefined);
});

test("mapHotelbedsCancellationResponseToCancellationResult: sin cancellationReference, queda undefined", () => {
  const booking: HotelbedsRawCancellation = { status: "CANCELLED" };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.cancellationReference, undefined);
});

test("mapHotelbedsCancellationResponseToCancellationResult: status CONFIRMED (cancelación no aplicada) -> cancelled=false, status='confirmed'", () => {
  const booking: HotelbedsRawCancellation = { status: "CONFIRMED" };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.cancelled, false);
  assert.equal(result.result.status, "confirmed");
});

test("mapHotelbedsCancellationResponseToCancellationResult: status PRECONFIRMED -> cancelled=false, status='pending'", () => {
  const booking: HotelbedsRawCancellation = { status: "PRECONFIRMED" };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") return;
  assert.equal(result.result.cancelled, false);
  assert.equal(result.result.status, "pending");
});

test("mapHotelbedsCancellationResponseToCancellationResult: status desconocido -> unknown_status, nunca inventa un resultado", () => {
  const booking: HotelbedsRawCancellation = { status: "ALGO_NUNCA_VISTO" };
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "unknown_status");
  if (result.outcome !== "unknown_status") return;
  assert.equal(result.rawStatus, "ALGO_NUNCA_VISTO");
});

test("mapHotelbedsCancellationResponseToCancellationResult: status ausente -> unknown_status (rawStatus vacío, nunca asume CANCELLED)", () => {
  const booking: HotelbedsRawCancellation = {};
  const result = mapHotelbedsCancellationResponseToCancellationResult(booking);
  assert.equal(result.outcome, "unknown_status");
});
