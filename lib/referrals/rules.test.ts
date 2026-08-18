// F8-03/F8-05 (VIAO_ROADMAP.md) — Tests de la configuración de la "acción
// válida" y los montos provisionales de referidos.
//
// 14/15 (mismo patrón que lib/rewards/rules.test.ts, F7-05) son
// requisitos de DOCUMENTACIÓN/diseño, no de comportamiento en runtime —
// se comprueban sobre el propio código fuente.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  REFERRED_REWARD_POINTS_PROVISIONAL,
  REFERRER_REWARD_POINTS_PROVISIONAL,
  VALID_REFERRAL_ACTION_TRIGGER,
} from "./rules";

test("VALID_REFERRAL_ACTION_TRIGGER es un único valor centralizado (F8-03)", () => {
  assert.equal(typeof VALID_REFERRAL_ACTION_TRIGGER, "string");
  assert.equal(VALID_REFERRAL_ACTION_TRIGGER, "booking_confirmed");
});

test("los montos de recompensa de referidos son números positivos concretos", () => {
  assert.ok(Number.isInteger(REFERRER_REWARD_POINTS_PROVISIONAL));
  assert.ok(REFERRER_REWARD_POINTS_PROVISIONAL > 0);
  assert.ok(Number.isInteger(REFERRED_REWARD_POINTS_PROVISIONAL));
  assert.ok(REFERRED_REWARD_POINTS_PROVISIONAL > 0);
});

// ── F8-03: la acción válida está centralizada en rules.ts ──
test("rules.ts marca explícitamente la acción válida como PROVISIONAL/CONFIGURABLE/PENDIENTE DE DEFINICIÓN DE NEGOCIO", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/referrals/rules.ts"), "utf-8");

  assert.ok(
    /PROVISIONAL \/ CONFIGURABLE \/ PENDIENTE DE DEFINICI[OÓ]N DE NEGOCIO/.test(source),
    "rules.ts debe marcar explícitamente la acción válida con esas tres etiquetas",
  );
  assert.ok(
    /export const VALID_REFERRAL_ACTION_TRIGGER/.test(source),
    "debe existir un único export que centralice la condición",
  );
});

test("solo app/booking/actions.ts y lib/referrals/ consultan VALID_REFERRAL_ACTION_TRIGGER — ninguna otra parte del sistema redefine la condición por su cuenta", () => {
  const bookingActionsSource = readFileSync(
    path.join(process.cwd(), "app/booking/actions.ts"),
    "utf-8",
  );

  assert.ok(
    /VALID_REFERRAL_ACTION_TRIGGER === "booking_confirmed"/.test(bookingActionsSource),
    "actions.ts debe comprobar la constante centralizada, no una condición propia",
  );
  assert.ok(
    /import \{ VALID_REFERRAL_ACTION_TRIGGER \} from "\.\.\/\.\.\/lib\/referrals\/rules"/.test(
      bookingActionsSource,
    ),
    "actions.ts debe importar la constante desde lib/referrals/rules.ts, no duplicarla",
  );
});

// ── 15. No existe conversión Points -> EUR definitiva ──
test("rules.ts no define ninguna conversión definitiva Points -> EUR", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/referrals/rules.ts"), "utf-8");

  assert.ok(
    !/EUR_PER_POINT|POINT_TO_EUR|EUR_CONVERSION|POINTS_TO_EUR_RATE/i.test(source),
    "no debe existir ninguna constante de conversión definitiva Points -> EUR",
  );
});

test("complete-referral-action.ts no calcula ninguna conversión a EUR ni comisión, y reutiliza createRewardTransaction (F7-01) en vez de escribir directamente en rewards_transactions", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/referrals/complete-referral-action.ts"),
    "utf-8",
  );

  assert.ok(
    !/EUR|commission|comisi[oó]n|revenue/i.test(source),
    "no debe calcular ni mencionar comisión/revenue/EUR",
  );
  assert.ok(
    /import \{ createRewardTransaction \} from "\.\.\/rewards\/create-reward-transaction"/.test(source),
    "debe reutilizar createRewardTransaction (F7-01), el único punto de escritura del ledger",
  );
  assert.ok(
    !/\.from\(\s*"rewards_transactions"\s*\)/.test(source),
    "no debe escribir directamente en rewards_transactions: eso crearía un segundo ledger paralelo",
  );
});
