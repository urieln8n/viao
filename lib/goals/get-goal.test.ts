// Bloque Goals V1 (VIAO_GOALS_V1_DECISION_LOCK.md, GOAL_PROGRESS_MODEL=
// WALLET_BALANCE, aprobado por el propietario) — tests de
// `calculateGoalProgressPercent()` y del comportamiento real de
// earn/redeem/refund sobre el progreso del Goal.
//
// Sustituye por completo a los tests anteriores de este archivo (modelo
// híbrido: "el progreso NUNCA retrocede al canjear", exclusión de
// `redemption_refund`) — ese comportamiento queda superado por la
// decisión V1: ahora el progreso SÍ baja al canjear y SÍ sube con un
// refund, porque es exactamente `wallet_balance / target_points`, sin
// ningún caso especial por `reason`.
//
// `getActiveGoal()` depende de `createSessionClient()` (next/headers) —
// no invocable directamente en `node:test` (mismo motivo documentado en
// el resto de `lib/goals/*.test.ts`). Los casos A/B/C/D/E/F/G/J se
// prueban de extremo a extremo contra Supabase real (signUp + RPCs
// reales de Rewards + saldo real leído de `rewards_transactions`),
// nunca con un mock que esconda el comportamiento real de Postgres. Los
// casos H/I (capado a 100%, target inválido) son puramente aritméticos
// y se prueban directamente sobre la función pura exportada.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "../rewards/redeem-reward";
import { cancelRedemption } from "../rewards/cancel-redemption";
import { calculateGoalProgressPercent } from "./calculate-progress";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `goalsv1-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "goalsv1-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number) {
  const service = createServiceRoleClient();
  await service.from("rewards_transactions").insert({ user_id: userId, amount, type: "earned", reason: "goalsv1_test_earning" });
}

async function getBalance(sessionClient: SupabaseClient, userId: string): Promise<number> {
  const { data } = await sessionClient.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

// Todo usuario nuevo recibe 100 Points de bono de registro
// (`handle_new_user()`) — los escenarios A-J de la matriz exigen valores
// de wallet EXACTOS (1000, 500...) para que las cifras de progreso
// resultantes coincidan con las especificadas. En vez de asumir un
// punto de partida en 0 (mismo error de clase ya documentado en otras
// fases de este proyecto: "olvidar el bono de registro"), este helper
// calcula el saldo real actual y otorga solo el delta necesario para
// alcanzar el objetivo exacto, sin importar cuál sea el bono vigente.
async function fundWalletTo(sessionClient: SupabaseClient, userId: string, targetAmount: number) {
  const current = await getBalance(sessionClient, userId);
  const delta = targetAmount - current;
  assert.ok(delta > 0, `fundWalletTo: el saldo actual (${current}) ya alcanza o supera el objetivo (${targetAmount})`);
  await grantPoints(userId, delta);
}

async function createTestReward(pointsCost: number): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({
      title: `Goals V1 test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points_cost: pointsCost,
      funding_type: "partner",
    })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

// ── H/I. calculateGoalProgressPercent(): casos puramente aritméticos ──
test("calculateGoalProgressPercent: capado a 100% cuando el wallet supera el target", () => {
  assert.equal(calculateGoalProgressPercent(1500, 1000), 100, "H: wallet > target nunca debe superar 100%");
});

test("calculateGoalProgressPercent: target_points inválido o cero -> 0%, nunca NaN/Infinity", () => {
  assert.equal(calculateGoalProgressPercent(500, 0), 0, "I: target=0 debe devolver 0, no dividir por cero");
  assert.equal(calculateGoalProgressPercent(500, -100), 0, "I: target negativo debe devolver 0, nunca un porcentaje negativo");
});

test("calculateGoalProgressPercent: casos base 0%/50%/100% (A/B/C)", () => {
  assert.equal(calculateGoalProgressPercent(0, 1000), 0, "A: 0 wallet / target 1000 -> 0%");
  assert.equal(calculateGoalProgressPercent(500, 1000), 50, "B: 500 wallet / target 1000 -> 50%");
  assert.equal(calculateGoalProgressPercent(1000, 1000), 100, "C: 1000 wallet / target 1000 -> 100%");
});

// ── D/E/F. Redeem reduce el progreso, de extremo a extremo con Rewards real ──
test("goals V1: redeem 300 sobre wallet=1000 -> progreso 70% (D)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await fundWalletTo(sessionClient, userId, 1000);

    const rewardId = await createTestReward(300);
    const result = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(result.outcome, "success");

    const balanceAfter = await getBalance(sessionClient, userId);
    assert.equal(balanceAfter, 700);
    assert.equal(calculateGoalProgressPercent(balanceAfter, 1000), 70, "D: redeem 300 sobre 1000 debe bajar el progreso a 70%");
  } finally {
    await deleteTestUser(userId);
  }
});

test("goals V1: redeem 800 sobre wallet=1000 -> progreso 20% (E)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await fundWalletTo(sessionClient, userId, 1000);
    const rewardId = await createTestReward(800);
    const result = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(result.outcome, "success");

    const balanceAfter = await getBalance(sessionClient, userId);
    assert.equal(balanceAfter, 200);
    assert.equal(calculateGoalProgressPercent(balanceAfter, 1000), 20, "E: redeem 800 sobre 1000 debe bajar el progreso a 20%");
  } finally {
    await deleteTestUser(userId);
  }
});

test("goals V1: redeem 1000 sobre wallet=1000 -> progreso 0%, ninguna promesa falsa de meta alcanzada (F)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await fundWalletTo(sessionClient, userId, 1000);
    const rewardId = await createTestReward(1000);
    const result = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(result.outcome, "success");

    const balanceAfter = await getBalance(sessionClient, userId);
    assert.equal(balanceAfter, 0);
    assert.equal(
      calculateGoalProgressPercent(balanceAfter, 1000),
      0,
      "F: gastar todo el wallet debe reflejarse como 0% real, nunca seguir mostrando 100%",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ── G. Refund devuelve el progreso, sin ninguna exclusión especial ──
test("goals V1: redeem 300 seguido de refund -> el progreso vuelve exactamente a donde estaba (G)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await fundWalletTo(sessionClient, userId, 1000);
    const rewardId = await createTestReward(300);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const balanceAfterRedeem = await getBalance(sessionClient, userId);
    assert.equal(balanceAfterRedeem, 700);
    assert.equal(calculateGoalProgressPercent(balanceAfterRedeem, 1000), 70);

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");

    const balanceAfterRefund = await getBalance(sessionClient, userId);
    assert.equal(balanceAfterRefund, 1000, "el refund debe devolver el wallet exactamente a 1000, sin exclusión especial de reason");
    assert.equal(
      calculateGoalProgressPercent(balanceAfterRefund, 1000),
      100,
      "G: tras el refund, el progreso debe volver a 100% igual que el wallet real, aritmética directa sin casos especiales",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ── J. Goal recién creado: el progreso se basa en el wallet ACTUAL, no en un snapshot congelado ──
test("goals V1: un Goal recién creado usa el saldo actual del wallet para el progreso, no un snapshot congelado (J)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await fundWalletTo(sessionClient, userId, 500);
    const balanceAtCreation = await getBalance(sessionClient, userId);
    assert.equal(balanceAtCreation, 500);

    const { data: goal, error } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 1000, points_at_goal_creation: 0 })
      .select("id, target_points")
      .single();
    assert.equal(error, null, error?.message);

    // El progreso se deriva del wallet real en el momento de la lectura
    // (nunca de `points_at_goal_creation`, que ya no participa en el
    // cálculo) — coincide con el saldo real ya existente ANTES de crear
    // el Goal.
    assert.equal(
      calculateGoalProgressPercent(balanceAtCreation, goal!.target_points as number),
      50,
      "J: el progreso de un Goal recién creado debe reflejar el wallet actual (500/1000 = 50%), no partir de 0",
    );
  } finally {
    await deleteTestUser(userId);
  }
});
