// F7-04/F7-05 (VIAO_ROADMAP.md) — Tests de la economía VIAO Rewards V1.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  HOTEL_BOOKING_REWARD_RATE,
  POINTS_PER_EURO,
  REGISTRATION_REWARD_POINTS_PROVISIONAL,
  calculateHotelBookingRewardPoints,
  pointsToEuroValue,
} from "./rules";

test("REGISTRATION_REWARD_POINTS_PROVISIONAL es un entero positivo", () => {
  assert.ok(Number.isInteger(REGISTRATION_REWARD_POINTS_PROVISIONAL));
  assert.ok(REGISTRATION_REWARD_POINTS_PROVISIONAL > 0);
});

test("POINTS_PER_EURO y HOTEL_BOOKING_REWARD_RATE son la economía V1 confirmada (100 Points = 1 €, 2% por reserva de hotel)", () => {
  assert.equal(POINTS_PER_EURO, 100);
  assert.equal(HOTEL_BOOKING_REWARD_RATE, 0.02);
});

// ── calculateHotelBookingRewardPoints: ejemplos obligatorios del bloque ──
test("calculateHotelBookingRewardPoints calcula el 2% del importe en Points, redondeado hacia abajo", () => {
  assert.equal(calculateHotelBookingRewardPoints(100), 200);
  assert.equal(calculateHotelBookingRewardPoints(250), 500);
  assert.equal(calculateHotelBookingRewardPoints(400), 800);
  assert.equal(calculateHotelBookingRewardPoints(1000), 2000);
});

test("calculateHotelBookingRewardPoints redondea hacia abajo para importes no exactos", () => {
  // 133 * 0.02 * 100 = 266 (exacto); 133.4 * 0.02 * 100 = 266.8 -> floor 266.
  assert.equal(calculateHotelBookingRewardPoints(133), 266);
  assert.equal(calculateHotelBookingRewardPoints(133.4), 266);
});

test("calculateHotelBookingRewardPoints devuelve 0 para un importe 0", () => {
  assert.equal(calculateHotelBookingRewardPoints(0), 0);
});

// ── pointsToEuroValue: inversa de la conversión V1 ──
test("pointsToEuroValue convierte Points a su valor aproximado en euros (100 Points = 1 €)", () => {
  assert.equal(pointsToEuroValue(200), 2);
  assert.equal(pointsToEuroValue(800), 8);
  assert.equal(pointsToEuroValue(1000), 10);
});

test("create-reward-transaction.ts no realiza ningún cálculo de comisión ni de revenue", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/rewards/create-reward-transaction.ts"),
    "utf-8",
  );

  assert.ok(
    !/commission|comisión|revenue/i.test(source),
    "la creación de transacciones no debe calcular ni mencionar comisión/revenue: eso pertenece a bookings, no a rewards_transactions",
  );
});
