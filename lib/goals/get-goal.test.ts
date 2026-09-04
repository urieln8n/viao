// P14.4-E (Decision Lock OPCIÓN B — VIAO_P14_4_D_P0_DECISIONS.md,
// VIAO_P14_4_E_P0_IMPLEMENTATION.md) — este archivo se reduce a los
// tests puramente aritméticos de `calculateGoalProgressPercent()`
// (capado a 100%, target inválido, casos base) — siguen siendo válidos
// sin ningún cambio: la función en sí no varió, solo cambió QUÉ valor
// recibe como primer argumento en producción (`earnedPoints`, no
// `walletBalance`, ver `./calculate-progress.ts`).
//
// Los tests D/E/F/G/J que vivían aquí (modelo V1, `GOAL_PROGRESS_MODEL=
// WALLET_BALANCE`: "redeem reduce el progreso", "refund lo sube sin
// exclusión especial", "un Goal recién creado usa el saldo actual, no un
// snapshot congelado") quedaban FALSOS bajo el modelo reactivado en este
// bloque — se retiraron en vez de dejarlos pasando mecánicamente
// mientras documentan un comportamiento que el producto ya no tiene. La
// cobertura de extremo a extremo del modelo nuevo (baseline, exclusión
// de `redemption_refund`, múltiples fuentes `earned`, Goal que nunca
// retrocede) vive ahora en `./get-earned-points.test.ts`, contra
// `getEarnedPointsTowardGoal()` — la única pieza de este dominio que
// necesita Supabase real, testeable directamente (sin `next/headers`,
// mismo motivo que este archivo nunca pudo invocar `getActiveGoal()`
// directamente).

import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateGoalProgressPercent } from "./calculate-progress";

test("calculateGoalProgressPercent: capado a 100% cuando earnedPoints supera el target", () => {
  assert.equal(calculateGoalProgressPercent(1500, 1000), 100, "earnedPoints > target nunca debe superar 100%");
});

test("calculateGoalProgressPercent: target_points inválido o cero -> 0%, nunca NaN/Infinity", () => {
  assert.equal(calculateGoalProgressPercent(500, 0), 0, "target=0 debe devolver 0, no dividir por cero");
  assert.equal(calculateGoalProgressPercent(500, -100), 0, "target negativo debe devolver 0, nunca un porcentaje negativo");
});

test("calculateGoalProgressPercent: casos base 0%/50%/100%", () => {
  assert.equal(calculateGoalProgressPercent(0, 1000), 0, "0 earned / target 1000 -> 0%");
  assert.equal(calculateGoalProgressPercent(500, 1000), 50, "500 earned / target 1000 -> 50%");
  assert.equal(calculateGoalProgressPercent(1000, 1000), 100, "1000 earned / target 1000 -> 100%");
});
