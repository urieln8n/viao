// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Test del modelo híbrido de
// progreso: "Ganado para tu objetivo" (acumulado, solo avanza) vs
// "Disponible ahora" (saldo real, que SÍ baja al canjear).
//
// `getActiveGoal()` depende de `createSessionClient()` (next/headers) —
// no invocable directamente en `node:test` (mismo motivo que
// create-goal.test.ts). Se replica aquí la MISMA lógica de cálculo
// (`points_at_goal_creation + SUM(earned desde created_at)`) contra
// Supabase real, para probar el comportamiento sin depender de
// `next/headers`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "../rewards/redeem-reward";
import { cancelRedemption } from "../rewards/cancel-redemption";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `bloque1-goalprogress-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "bloque1-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number) {
  const service = createServiceRoleClient();
  await service.from("rewards_transactions").insert({ user_id: userId, amount, type: "earned", reason: "bloque1_test_earning" });
}

async function createTestReward(pointsCost: number): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({
      title: `Bloque 1 goal-progress test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points_cost: pointsCost,
      funding_type: "partner",
    })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

async function getBalance(sessionClient: SupabaseClient, userId: string): Promise<number> {
  const { data } = await sessionClient.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

/** Misma lógica exacta que `lib/goals/get-goal.ts` — replicada aquí para poder probarla sin `next/headers`. */
async function computeEarnedTowardGoal(sessionClient: SupabaseClient, goalId: string): Promise<number> {
  const { data: goal } = await sessionClient
    .from("goals")
    .select("points_at_goal_creation, created_at")
    .eq("id", goalId)
    .single();

  // Fase F (hallazgo HIGH de Fase E): excluye 'redemption_refund' — mismo
  // motivo exacto documentado en `lib/goals/get-goal.ts`. Este helper debe
  // seguir replicando la lógica REAL exactamente, o dejaría de detectar
  // una regresión futura.
  const { data: earnedRows } = await sessionClient
    .from("rewards_transactions")
    .select("amount")
    .eq("type", "earned")
    .neq("reason", "redemption_refund")
    .gte("created_at", goal!.created_at as string);

  const earnedSinceCreation = (earnedRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
  return (goal!.points_at_goal_creation as number) + earnedSinceCreation;
}

// ── 10. Goal: points_at_goal_creation congelado, progreso no retrocede al canjear, saldo sí baja ──
test("goals: el progreso acumulado NUNCA retrocede al canjear un Reward, mientras que el saldo disponible sí baja", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await grantPoints(userId, 1000);

    const { data: goal, error } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 5000, points_at_goal_creation: 0 })
      .select("id, points_at_goal_creation")
      .single();
    assert.equal(error, null, error?.message);

    const frozenSnapshot = goal!.points_at_goal_creation as number;
    const progressBeforeRedeem = await computeEarnedTowardGoal(sessionClient, goal!.id as string);

    // Ganar más Points DESPUÉS de crear el Goal: el progreso debe subir.
    await grantPoints(userId, 500);
    const progressAfterEarning = await computeEarnedTowardGoal(sessionClient, goal!.id as string);
    assert.equal(progressAfterEarning, progressBeforeRedeem + 500, "ganar Points debe aumentar el progreso");

    // Canjear un Reward (gasta Points reales): el progreso NUNCA debe bajar.
    const rewardId = await createTestReward(300);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");

    const progressAfterRedeem = await computeEarnedTowardGoal(sessionClient, goal!.id as string);
    assert.equal(
      progressAfterRedeem,
      progressAfterEarning,
      "el progreso acumulado NUNCA debe bajar al canjear — solo cuenta lo GANADO, nunca lo gastado",
    );

    // El saldo real (Wallet), en cambio, SÍ debe reflejar el gasto.
    const { data: balanceRows } = await sessionClient.from("rewards_transactions").select("amount").eq("user_id", userId);
    const realBalance = (balanceRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
    assert.ok(realBalance < progressAfterRedeem, "el saldo real disponible debe ser MENOR que el progreso acumulado tras canjear — son dos cifras distintas, nunca la misma");

    // points_at_goal_creation sigue siendo exactamente el snapshot original.
    const { data: goalAfter } = await sessionClient.from("goals").select("points_at_goal_creation").eq("id", goal!.id as string).single();
    assert.equal(goalAfter!.points_at_goal_creation, frozenSnapshot, "points_at_goal_creation nunca cambia tras la creación");
  } finally {
    await deleteTestUser(userId);
  }
});

// Fase F (auditoría independiente del Bloque 1, hallazgo HIGH de Fase E)
// — reproduce EXACTAMENTE el bug encontrado: un ciclo
// redeem -> cancel/refund es económicamente neutro (el saldo disponible
// vuelve a donde estaba), pero el refund se inserta como
// `type='earned', reason='redemption_refund'` — sin la exclusión de
// `get-goal.ts`, ese refund se sumaba al progreso como si fuera una
// ganancia genuina nueva, inflándolo sin límite y sin coste real. Este
// test falla con el código anterior a Fase F y pasa con la corrección.
test("goals (Fase F, hallazgo HIGH): redeem -> cancel/refund NUNCA infla 'Ganado para tu objetivo', aunque SÍ devuelve el saldo disponible", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await grantPoints(userId, 1_000_000);

    const { data: goal } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 1_000_000, points_at_goal_creation: 0 })
      .select("id")
      .single();
    const goalId = goal!.id as string;

    const progressAtCreation = await computeEarnedTowardGoal(sessionClient, goalId);
    const balanceAtCreation = await getBalance(sessionClient, userId);

    // Ganancia real (+200): el progreso debe subir exactamente lo mismo.
    await grantPoints(userId, 200);
    const progressAfterEarning = await computeEarnedTowardGoal(sessionClient, goalId);
    assert.equal(progressAfterEarning, progressAtCreation + 200, "una ganancia genuina de 200 debe sumar exactamente 200 al progreso");

    // Canje (-300 spent): el progreso NO baja; el saldo disponible sí.
    const rewardId = await createTestReward(300);
    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const progressAfterRedeem = await computeEarnedTowardGoal(sessionClient, goalId);
    const balanceAfterRedeem = await getBalance(sessionClient, userId);
    assert.equal(progressAfterRedeem, progressAfterEarning, "canjear no debe bajar el progreso");
    assert.equal(balanceAfterRedeem, balanceAtCreation + 200 - 300, "el saldo disponible SÍ debe reflejar el gasto del canje");

    // Cancelación/refund (+300 earned, reason='redemption_refund'): el
    // progreso debe quedarse EXACTAMENTE donde estaba tras ganar los 200
    // — el refund NUNCA cuenta como progreso nuevo. El saldo disponible
    // SÍ debe volver exactamente a como estaba antes del canje.
    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");

    const progressAfterCancel = await computeEarnedTowardGoal(sessionClient, goalId);
    const balanceAfterCancel = await getBalance(sessionClient, userId);

    assert.equal(
      progressAfterCancel,
      progressAfterEarning,
      "el refund de una redención cancelada NUNCA debe contar como progreso hacia el objetivo (hallazgo HIGH, Fase E)",
    );
    assert.equal(
      balanceAfterCancel,
      balanceAfterRedeem + 300,
      "el refund SÍ debe devolver los Points gastados al saldo disponible",
    );
    assert.equal(
      balanceAfterCancel,
      balanceAtCreation + 200,
      "saldo antes del canje == saldo tras cancelar: el ciclo redeem->cancel es económicamente neutro para el saldo disponible",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// Fase F — el ciclo redeem->cancel repetido varias veces tampoco debe
// acumular progreso artificial (cada ciclo por separado es neutro; N
// ciclos seguidos deben seguir siendo neutros, no sumarse).
test("goals (Fase F): repetir el ciclo redeem->cancel varias veces NUNCA acumula progreso artificial", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await grantPoints(userId, 1_000_000);

    const { data: goal } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Tokio", target_points: 1_000_000, points_at_goal_creation: 0 })
      .select("id")
      .single();
    const goalId = goal!.id as string;

    const progressBefore = await computeEarnedTowardGoal(sessionClient, goalId);
    const balanceBefore = await getBalance(sessionClient, userId);

    for (let cycle = 0; cycle < 3; cycle++) {
      const rewardId = await createTestReward(300);
      const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
      assert.equal(redeemResult.outcome, "success");
      if (redeemResult.outcome !== "success") return;

      const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
      assert.equal(cancelResult.outcome, "success");
    }

    const progressAfter = await computeEarnedTowardGoal(sessionClient, goalId);
    const balanceAfter = await getBalance(sessionClient, userId);

    assert.equal(
      progressAfter,
      progressBefore,
      "3 ciclos redeem->cancel sin ninguna ganancia genuina no deben mover el progreso ni un solo Point",
    );
    assert.equal(balanceAfter, balanceBefore, "el saldo disponible debe volver exactamente al mismo punto tras cada ciclo completo");
  } finally {
    await deleteTestUser(userId);
  }
});
