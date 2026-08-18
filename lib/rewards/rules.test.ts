// F7-04/F7-05 (VIAO_ROADMAP.md) — Tests de las reglas promocionales.
//
// 14/15 son requisitos de DOCUMENTACIÓN/diseño, no de comportamiento en
// runtime — se comprueban sobre el propio código fuente, igual que otros
// tests estructurales de este proyecto (p. ej.
// app/booking/actions.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  BOOKING_REWARD_POINTS_PROVISIONAL,
  REGISTRATION_REWARD_POINTS_PROVISIONAL,
} from "./rules";

test("los montos de recompensa son números positivos concretos (sin los cuales las Server Actions/triggers no podrían operar)", () => {
  assert.ok(Number.isInteger(REGISTRATION_REWARD_POINTS_PROVISIONAL));
  assert.ok(REGISTRATION_REWARD_POINTS_PROVISIONAL > 0);
  assert.ok(Number.isInteger(BOOKING_REWARD_POINTS_PROVISIONAL));
  assert.ok(BOOKING_REWARD_POINTS_PROVISIONAL > 0);
});

// ── 14. Los montos están marcados como PROVISIONALES ──
test("rules.ts marca explícitamente los montos como PROVISIONAL en el código", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/rewards/rules.ts"), "utf-8");

  assert.ok(/PROVISIONAL/.test(source), "rules.ts debe marcar explícitamente los montos como provisionales");

  const registrationExport = source.match(
    /export const REGISTRATION_REWARD_POINTS_PROVISIONAL[\s\S]{0,20}/,
  );
  const bookingExport = source.match(/export const BOOKING_REWARD_POINTS_PROVISIONAL[\s\S]{0,20}/);
  assert.ok(registrationExport, "debe existir REGISTRATION_REWARD_POINTS_PROVISIONAL");
  assert.ok(bookingExport, "debe existir BOOKING_REWARD_POINTS_PROVISIONAL");
});

// ── 15. No existe conversión Points -> EUR definitiva ──
test("rules.ts no define ninguna conversión definitiva Points -> EUR", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/rewards/rules.ts"), "utf-8");

  assert.ok(
    !/EUR_PER_POINT|POINT_TO_EUR|EUR_CONVERSION|POINTS_TO_EUR_RATE/i.test(source),
    "no debe existir ninguna constante de conversión definitiva Points -> EUR",
  );
  assert.ok(
    /no representan una conversión|NO establecer una conversión|sin ninguna conversión/i.test(source),
    "debe documentarse explícitamente que no hay conversión definitiva a EUR",
  );
});

test("create-reward-transaction.ts no realiza ningún cálculo de conversión a EUR ni de comisión", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/rewards/create-reward-transaction.ts"), "utf-8");

  assert.ok(
    !/EUR|commission|comisión|revenue/i.test(source),
    "la creación de transacciones no debe calcular ni mencionar comisión/revenue/EUR: eso pertenece a bookings, no a rewards_transactions",
  );
});
