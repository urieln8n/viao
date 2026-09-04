// P14.4-E (Decision Lock OPCIÓN B — VIAO_P14_4_D_P0_DECISIONS.md,
// VIAO_P14_4_E_P0_IMPLEMENTATION.md) — tests de extremo a extremo de
// `getEarnedPointsTowardGoal()` contra Supabase real (signUp + RPCs
// reales de Rewards + lectura real de `rewards_transactions`/`goals`),
// mismo criterio ya establecido en el resto de `lib/goals/*.test.ts`/
// `lib/rewards/*.test.ts`: nunca un mock que esconda el comportamiento
// real de Postgres/RLS/triggers.
//
// Cubre exactamente los 9 escenarios pedidos por el encargo P14.4-E §14
// (Tests 1-9), más los casos numéricos exactos de sus secciones §6
// (secuencia +100/-50/+30) y §8 (refund +100/-100/+100).
//
// NOTA — contradicción detectada en el encargo, resuelta explícitamente
// aquí (ver también VIAO_P14_4_E_P0_IMPLEMENTATION.md, sección "Riesgos
// / Open Questions"): la sección §7 del encargo ("BASELINE") da un
// ejemplo numérico (baseline=300, earned posterior=+50 -> "Goal progress:
// 50/500, NO: 350/500") que CONTRADICE directamente la fórmula explícita
// de su propia sección §4 ("earnedTowardGoal = baseline + SUM(earned
// posteriores)", que para baseline=300 y +50 posterior da 350, no 50) —
// y también contradice el modelo histórico ya construido y documentado
// en `20260823153000_create_goals.sql` (aditivo, mismo `baseline + SUM`).
// El test "Test 4" de abajo implementa la fórmula ADITIVA de §4 (baseline
// SÍ se suma) por ser la que coincide con el propio Decision Lock del
// bloque y con el precedente histórico ya aprobado por el propietario —
// si la intención real era la lectura de §7 (el baseline se captura pero
// NO se suma, el Goal solo cuenta lo ganado desde su creación), este es
// el test exacto a corregir, y el cambio de implementación sería mínimo
// (retirar `pointsAtGoalCreation` de la suma en `get-earned-points.ts`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "../rewards/redeem-reward";
import { cancelRedemption } from "../rewards/cancel-redemption";
import { calculateGoalProgressPercent } from "./calculate-progress";
import { getEarnedPointsTowardGoal } from "./get-earned-points";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `p1440e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "p1440e-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number, reason: string) {
  const service = createServiceRoleClient();
  const { error } = await service
    .from("rewards_transactions")
    .insert({ user_id: userId, amount, type: "earned", reason });
  assert.equal(error, null, error?.message);
}

async function getBalance(sessionClient: SupabaseClient, userId: string): Promise<number> {
  const { data } = await sessionClient.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

// Mismo patrón exacto que `createGoal()` (lib/goals/create-goal.ts):
// `points_at_goal_creation: 0` es un placeholder, el trigger
// `security definer` `set_goal_points_at_creation()` lo SOBRESCRIBE
// siempre con el saldo real en ese instante — nunca se confía en el
// valor enviado, ni siquiera en este test.
async function createGoalRow(sessionClient: SupabaseClient, userId: string, targetPoints: number) {
  const { data, error } = await sessionClient
    .from("goals")
    .insert({ user_id: userId, title: "P14.4-E test goal", target_points: targetPoints, points_at_goal_creation: 0 })
    .select("id, created_at, points_at_goal_creation")
    .single();
  assert.equal(error, null, error?.message);
  return {
    id: data!.id as string,
    createdAt: data!.created_at as string,
    pointsAtGoalCreation: data!.points_at_goal_creation as number,
  };
}

async function createTestReward(pointsCost: number): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({
      title: `P14.4-E test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points_cost: pointsCost,
      funding_type: "partner",
    })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

async function deactivateTestReward(rewardId: string) {
  const service = createServiceRoleClient();
  await service.from("rewards_catalog").update({ active: false }).eq("id", rewardId);
}

// ── Test 1 — earned aumenta earnedTowardGoal ──
test("getEarnedPointsTowardGoal: un movimiento earned aumenta earnedTowardGoal (Test 1)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    const before = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);

    await grantPoints(userId, 100, "mission:goal_created");
    const after = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);

    assert.equal(after, before + 100, "Test 1: earned +100 debe aumentar earnedTowardGoal en exactamente 100");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 2 — spent (redemption) NO reduce earnedTowardGoal ──
test("getEarnedPointsTowardGoal: canjear (spent/'redemption') no reduce earnedTowardGoal, aunque sí reduce el saldo real de Wallet (Test 2)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    await grantPoints(userId, 100, "mission:return_visit");
    const earnedBefore = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    const walletBefore = await getBalance(sessionClient, userId);

    rewardId = await createTestReward(50);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");

    const earnedAfter = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earnedAfter, earnedBefore, "Test 2: canjear no debe cambiar earnedTowardGoal en absoluto");

    // Confirma, como regresión, que P0-1 no tocó el comportamiento real
    // de Wallet — sigue bajando exactamente como antes.
    const walletAfter = await getBalance(sessionClient, userId);
    assert.equal(walletAfter, walletBefore - 50, "Wallet SÍ debe seguir bajando con el canje — solo Goal deja de hacerlo");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Test 3 — redemption_refund NO aumenta earnedTowardGoal (evita doble contabilidad) ──
// Caso numérico exacto del encargo §8: +100 earned / -100 redemption / +100 redemption_refund -> Goal=100, NO 200.
test("getEarnedPointsTowardGoal: +100 earned, -100 redemption, +100 redemption_refund -> earnedTowardGoal queda en 100, nunca 200 (Test 3, caso §8)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    const baseline = goal.pointsAtGoalCreation;

    await grantPoints(userId, 100, "partner_activity");
    let earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earned, baseline + 100, "tras +100 earned, earnedTowardGoal debe subir exactamente 100");

    rewardId = await createTestReward(100);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earned, baseline + 100, "tras -100 redemption, earnedTowardGoal debe seguir en baseline+100 (Test 2 ya lo confirma; aquí es el punto de partida del ciclo)");

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");

    earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(
      earned,
      baseline + 100,
      "Test 3: tras +100 redemption_refund, earnedTowardGoal debe seguir en baseline+100 — NUNCA baseline+200. El ciclo completo canjear+refund tiene efecto neto cero.",
    );
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Test 4 — el baseline (points_at_goal_creation) se respeta ──
test("getEarnedPointsTowardGoal: el baseline capturado al crear el Goal se SUMA al earned posterior (Test 4 — ver nota de cabecera sobre la contradicción §4/§7 del encargo)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const current = await getBalance(sessionClient, userId);
    const targetBaseline = current + 300;
    await grantPoints(userId, targetBaseline - current, "p1440e_preexisting_balance");

    const goal = await createGoalRow(sessionClient, userId, 1000);
    assert.equal(
      goal.pointsAtGoalCreation,
      targetBaseline,
      "el trigger set_goal_points_at_creation() debe capturar el saldo real (300 por encima del previo) en el momento del INSERT",
    );

    await grantPoints(userId, 50, "mission:return_visit");
    const earnedTowardGoal = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);

    assert.equal(
      earnedTowardGoal,
      targetBaseline + 50,
      `Test 4: earnedTowardGoal = baseline (${targetBaseline}) + earned posterior (50) = ${targetBaseline + 50} — fórmula aditiva de §4 del encargo`,
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 5 — 'mission:<key>' cuenta como earned válido ──
test("getEarnedPointsTowardGoal: reason='mission:<key>' (patrón, no valor fijo 'mission') cuenta como earned válido (Test 5)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    const before = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);

    await grantPoints(userId, 10, "mission:profile_completed");
    await grantPoints(userId, 50, "mission:goal_created");

    const after = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(after, before + 60, "Test 5: dos reasons 'mission:<key>' distintos deben contar íntegramente, sin depender de un valor fijo 'mission'");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 6 — múltiples fuentes earned suman correctamente ──
test("getEarnedPointsTowardGoal: múltiples fuentes legítimas (referral/mission/partner_activity) suman correctamente (Test 6)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 1000);
    const before = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);

    await grantPoints(userId, 20, "referral");
    await grantPoints(userId, 10, "mission:profile_completed");
    await grantPoints(userId, 15, "partner_activity");

    const after = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(after, before + 45, "Test 6: 20 (referral) + 10 (mission) + 15 (partner_activity) = 45");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 7 — el Goal nunca retrocede por redemption ──
// Caso numérico exacto del encargo §6: Goal=500, +100, -50 (sin cambio), +30.
test("getEarnedPointsTowardGoal: secuencia +100 / -50 (canje) / +30 — earnedTowardGoal nunca retrocede (Test 7, caso §6)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    const baseline = goal.pointsAtGoalCreation;

    await grantPoints(userId, 100, "mission:goal_created");
    let earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earned, baseline + 100);

    rewardId = await createTestReward(50);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earned, baseline + 100, "Test 7: tras -50 (canje), earnedTowardGoal debe seguir en baseline+100, NUNCA bajar a baseline+50");

    await grantPoints(userId, 30, "partner_activity");
    earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earned, baseline + 130, "Test 7: earned +30 tras el canje debe sumarse sobre baseline+100, dando baseline+130");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Test 8 — el Goal puede alcanzar el 100% ──
test("getEarnedPointsTowardGoal + calculateGoalProgressPercent: el Goal puede alcanzar exactamente el 100% (Test 8)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const targetPoints = 200;
    const goal = await createGoalRow(sessionClient, userId, targetPoints);
    const remaining = targetPoints - goal.pointsAtGoalCreation;
    if (remaining > 0) {
      await grantPoints(userId, remaining, "mission:goal_created");
    }

    const earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(calculateGoalProgressPercent(earned, targetPoints), 100, "Test 8: earnedTowardGoal == target debe dar exactamente 100%");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 9 — Goal >100% se comporta según la lógica actual de cap ──
test("getEarnedPointsTowardGoal + calculateGoalProgressPercent: earnedTowardGoal puede superar el target sin capar; solo el % se capa en 100% (Test 9)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const targetPoints = 100;
    const goal = await createGoalRow(sessionClient, userId, targetPoints);
    await grantPoints(userId, 500, "mission:goal_created");

    const earned = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.ok(earned > targetPoints, "earnedTowardGoal en sí NO se capa artificialmente — es una cifra real, puede superar el target");
    assert.equal(
      calculateGoalProgressPercent(earned, targetPoints),
      100,
      "Test 9: solo el PORCENTAJE mostrado se capa en 100% — mismo comportamiento ya existente de calculateGoalProgressPercent(), sin cambios",
    );
  } finally {
    await deleteTestUser(userId);
  }
});
