// P14.4-F (F4 — Goal Completion) — tests de extremo a extremo de
// `completeGoalIfThresholdMet()` / `complete_goal_if_threshold_met()`
// contra Supabase real (signUp + RPCs reales de Rewards + lectura real
// de `rewards_transactions`/`goals`), mismo criterio que
// `get-earned-points.test.ts`.
//
// Cubre exactamente los 10 escenarios pedidos por el encargo P14.4-F
// (sección "TESTS OBLIGATORIOS — Goal", puntos 1-10).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "../rewards/redeem-reward";
import { cancelRedemption } from "../rewards/cancel-redemption";
import { getEarnedPointsTowardGoal } from "./get-earned-points";
import { completeGoalIfThresholdMet } from "./complete-goal-if-threshold-met";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `p144f-completion-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "p144f-completion-pw-12345" });
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

async function createGoalRow(sessionClient: SupabaseClient, userId: string, targetPoints: number) {
  const { data, error } = await sessionClient
    .from("goals")
    .insert({ user_id: userId, title: "P14.4-F completion test goal", target_points: targetPoints, points_at_goal_creation: 0 })
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
      title: `P14.4-F completion test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

async function readGoalRow(goalId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service.from("goals").select("status, completed_at").eq("id", goalId).single();
  assert.equal(error, null, error?.message);
  return { status: data!.status as string, completedAt: data!.completed_at as string | null };
}

// ── Test 1 — Goal por debajo del objetivo -> active ──
test("complete_goal_if_threshold_met: por debajo del objetivo -> active, just_completed:false (Test 1)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    await grantPoints(userId, 100, "mission:goal_created");

    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.deepEqual(result, { goalStatus: "active", justCompleted: false });

    const row = await readGoalRow(goal.id);
    assert.equal(row.status, "active");
    assert.equal(row.completedAt, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 2 — Goal exactamente en targetPoints -> completed ──
test("complete_goal_if_threshold_met: earnedPoints exactamente igual a targetPoints -> completed, just_completed:true (Test 2)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 200);
    const remaining = 200 - goal.pointsAtGoalCreation;
    await grantPoints(userId, remaining, "mission:goal_created");

    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.deepEqual(result, { goalStatus: "completed", justCompleted: true });

    const row = await readGoalRow(goal.id);
    assert.equal(row.status, "completed");
    assert.ok(row.completedAt, "completed_at debe quedar establecido");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 3 — Goal por encima de targetPoints -> completed ──
test("complete_goal_if_threshold_met: earnedPoints por encima de targetPoints -> completed, just_completed:true (Test 3)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 500, "mission:goal_created");

    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.deepEqual(result, { goalStatus: "completed", justCompleted: true });
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 4 — Redemption posterior -> Goal continúa completed ──
test("complete_goal_if_threshold_met: una redemption posterior a la completion no reabre el Goal (Test 4)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 100, "mission:goal_created");

    const completion = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(completion.justCompleted, true);

    rewardId = await createTestReward(50);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");

    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.deepEqual(result, { goalStatus: "completed", justCompleted: false }, "Test 4: sigue 'completed', y NO se re-celebra");

    const row = await readGoalRow(goal.id);
    assert.equal(row.status, "completed");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Test 5 — Refund posterior -> Goal se comporta correctamente ──
test("complete_goal_if_threshold_met: un refund posterior a la completion no altera el Goal ya completado (Test 5)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 100, "mission:goal_created");

    const completion = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(completion.justCompleted, true);

    rewardId = await createTestReward(50);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");

    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.deepEqual(result, { goalStatus: "completed", justCompleted: false }, "Test 5: el refund no reabre ni re-celebra el Goal ya completado");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Test 6 — Completion idempotente ──
test("complete_goal_if_threshold_met: llamar dos veces seguidas es idempotente, completed_at no cambia (Test 6)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 100, "mission:goal_created");

    const first = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(first.justCompleted, true);
    const rowAfterFirst = await readGoalRow(goal.id);

    const second = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(second.justCompleted, false);
    const rowAfterSecond = await readGoalRow(goal.id);

    assert.equal(rowAfterSecond.completedAt, rowAfterFirst.completedAt, "Test 6: completed_at no debe cambiar en la segunda llamada");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 7 — No doble completion (mismo caso que 6, enfatizado explícitamente) ──
test("complete_goal_if_threshold_met: nunca se completa dos veces — la segunda llamada nunca vuelve a otorgar just_completed:true (Test 7)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 300, "mission:goal_created"); // muy por encima, a propósito

    const calls = [];
    for (let i = 0; i < 4; i++) {
      calls.push(await completeGoalIfThresholdMet(goal.id, userId));
    }
    const justCompletedCount = calls.filter((c) => c.justCompleted).length;
    assert.equal(justCompletedCount, 1, "Test 7: de 4 llamadas secuenciales, exactamente 1 debe ser just_completed:true");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 8 — Concurrencia / doble request ──
test("complete_goal_if_threshold_met: 5 llamadas concurrentes reales -> exactamente 1 just_completed:true, saldo de completions nunca duplicado (Test 8)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 100);
    await grantPoints(userId, 500, "mission:goal_created");

    const results = await Promise.all(
      Array.from({ length: 5 }, () => completeGoalIfThresholdMet(goal.id, userId)),
    );
    const justCompletedCount = results.filter((r) => r.justCompleted).length;
    assert.equal(justCompletedCount, 1, "Test 8: 5 llamadas concurrentes reales -> exactamente 1 just_completed:true, nunca 0 ni más de 1");
    assert.ok(results.every((r) => r.goalStatus === "completed"), "todas deben ver el Goal como 'completed' al terminar");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 9 — earnedPoints utiliza el modelo P14.4-E (misma fórmula que getEarnedPointsTowardGoal) ──
test("complete_goal_if_threshold_met: usa la MISMA fórmula que getEarnedPointsTowardGoal() (baseline + earned posterior, P14.4-E) (Test 9)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const goal = await createGoalRow(sessionClient, userId, 1000);
    await grantPoints(userId, 300, "mission:goal_created");
    await grantPoints(userId, 200, "partner_activity");

    const earnedPoints = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earnedPoints, goal.pointsAtGoalCreation + 500, "referencia: la fórmula P14.4-E ya probada en get-earned-points.test.ts");

    // Con target=1000 y earnedPoints muy por debajo, el RPC debe coincidir: sigue activo.
    const belowResult = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(belowResult.goalStatus, "active", "Test 9: el RPC debe estar de acuerdo con getEarnedPointsTowardGoal() en que 500 < 1000");

    // Ahora se completa el resto exacto y se confirma que el RPC lo reconoce con la MISMA fórmula.
    await grantPoints(userId, 500, "mission:goal_created");
    const earnedPointsAfter = await getEarnedPointsTowardGoal(sessionClient, userId, goal.createdAt, goal.pointsAtGoalCreation);
    assert.equal(earnedPointsAfter, goal.pointsAtGoalCreation + 1000);

    const completedResult = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(completedResult.justCompleted, true, "Test 9: el RPC debe completar en el mismo punto exacto que getEarnedPointsTowardGoal() alcanza el target");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 10 — redemption_refund no infla earnedPoints (tampoco en el contexto de completion) ──
test("complete_goal_if_threshold_met: redemption_refund nunca infla earnedPoints lo suficiente para completar un Goal que no debería completarse (Test 10)", async () => {
  const { userId, sessionClient } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const goal = await createGoalRow(sessionClient, userId, 500);
    await grantPoints(userId, 100, "mission:goal_created");

    rewardId = await createTestReward(100);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");

    // earnedPoints sigue en (baseline)+100 — el ciclo canjear+refund no debe
    // haber sumado nada extra (ya probado en get-earned-points.test.ts,
    // aquí se confirma también a través del propio RPC de completion).
    const result = await completeGoalIfThresholdMet(goal.id, userId);
    assert.equal(result.goalStatus, "active", "Test 10: el ciclo canjear+refund (100 Points) no debe acercar al Goal (target=500) a completarse de más");
    assert.equal(result.justCompleted, false);
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Autorización — un Goal ajeno devuelve not_found (anti-enumeración) ──
test("complete_goal_if_threshold_met: un goalId/userId que no coinciden devuelve not_found, sin filtrar información", async () => {
  const { userId: ownerId, sessionClient: ownerClient } = await signUpUser();
  const { userId: strangerId } = await signUpUser();
  try {
    const goal = await createGoalRow(ownerClient, ownerId, 100);
    await grantPoints(ownerId, 100, "mission:goal_created");

    const result = await completeGoalIfThresholdMet(goal.id, strangerId);
    assert.deepEqual(result, { goalStatus: "not_found", justCompleted: false });

    const row = await readGoalRow(goal.id);
    assert.equal(row.status, "active", "el Goal del owner real no debe verse afectado por el intento del extraño");
  } finally {
    await deleteTestUser(ownerId);
    await deleteTestUser(strangerId);
  }
});
