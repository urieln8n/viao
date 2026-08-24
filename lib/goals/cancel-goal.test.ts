// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Test de cancelación de Goal.
// Misma limitación de `next/headers` que el resto de `lib/goals/*.test.ts`
// — probado directamente contra Supabase con un cliente de sesión real.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `bloque1-cancelgoal-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "bloque1-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function getBalance(sessionClient: SupabaseClient, userId: string): Promise<number> {
  const { data } = await sessionClient.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

test("goals: cancelar el Goal activo lo transiciona a 'cancelled' y libera el hueco para uno nuevo", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { data: goal } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 1000, points_at_goal_creation: 0 })
      .select("id")
      .single();

    const { data: cancelled, error } = await sessionClient
      .from("goals")
      .update({ status: "cancelled" })
      .eq("id", goal!.id as string)
      .eq("status", "active")
      .select("status")
      .single();

    assert.equal(error, null, error?.message);
    assert.equal(cancelled!.status, "cancelled");

    // Con el anterior cancelado, debe poder crearse uno nuevo.
    const { error: newGoalError } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Tokio", target_points: 2000, points_at_goal_creation: 0 });
    assert.equal(newGoalError, null, "tras cancelar, la tupla queda libre para un Goal nuevo");
  } finally {
    await deleteTestUser(userId);
  }
});

// Fase D (auditoría independiente del Bloque 1, hallazgo C) — reproduce
// exactamente el ataque que encontró la auditoría: un UPDATE directo del
// propio usuario sobre campos económicos/inmutables de su Goal. El
// trigger `goals_set_points_at_creation` es `before insert`, nunca
// `before update` — sin el trigger nuevo de Fase D
// (`goals_protect_immutable_fields`), esto habría tenido éxito.
test("goals: el cliente NO puede modificar points_at_goal_creation ni target_points vía UPDATE directo", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { data: created } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 5000, points_at_goal_creation: 0 })
      .select("id, points_at_goal_creation")
      .single();

    const goalId = created!.id as string;
    const realSnapshot = created!.points_at_goal_creation as number;

    const { error: tamperPointsError } = await sessionClient
      .from("goals")
      .update({ points_at_goal_creation: 999_999_999 })
      .eq("id", goalId);
    assert.ok(tamperPointsError, "el trigger debe rechazar cualquier intento de modificar points_at_goal_creation");

    const { error: tamperTargetError } = await sessionClient
      .from("goals")
      .update({ target_points: 1 })
      .eq("id", goalId);
    assert.ok(tamperTargetError, "target_points tampoco es editable vía UPDATE en este bloque");

    const { data: afterAttempts } = await sessionClient
      .from("goals")
      .select("points_at_goal_creation, target_points")
      .eq("id", goalId)
      .single();
    assert.equal(afterAttempts!.points_at_goal_creation, realSnapshot, "el snapshot debe seguir siendo el original, sin cambios");
    assert.equal(afterAttempts!.target_points, 5000, "target_points debe seguir siendo el original, sin cambios");
  } finally {
    await deleteTestUser(userId);
  }
});

test("goals: status solo puede transicionar de active a cancelled — nunca a completed, y un Goal cancelado nunca se reactiva", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { data: created } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 5000, points_at_goal_creation: 0 })
      .select("id")
      .single();
    const goalId = created!.id as string;

    // Salto directo a un estado no permitido.
    const { error: completedError } = await sessionClient
      .from("goals")
      .update({ status: "completed" })
      .eq("id", goalId);
    assert.ok(completedError, "active -> completed debe rechazarse: no es una transición soportada en este bloque");

    // La transición legítima (cancelación) debe seguir funcionando.
    const { error: cancelError, data: cancelled } = await sessionClient
      .from("goals")
      .update({ status: "cancelled" })
      .eq("id", goalId)
      .select("status")
      .single();
    assert.equal(cancelError, null, cancelError?.message);
    assert.equal(cancelled!.status, "cancelled");

    // Reactivar un Goal ya cancelado debe rechazarse.
    const { error: reactivateError } = await sessionClient
      .from("goals")
      .update({ status: "active" })
      .eq("id", goalId);
    assert.ok(reactivateError, "cancelled -> active debe rechazarse: un Goal cancelado nunca se reactiva por UPDATE directo");
  } finally {
    await deleteTestUser(userId);
  }
});

// Mini-fix (checkpoint post-Bloque 1, gap de UI) — la UI ahora invoca
// cancelGoalAction() -> cancelGoal(), que hace exactamente el mismo
// UPDATE ya probado arriba. Lo que faltaba por probar explícitamente:
// (1) tras cancelar, una consulta que filtre status='active' (la misma
// forma en la que getActiveGoal() encuentra el Goal activo) ya no
// encuentra ninguno; (2) cancelar un Goal no genera ningún movimiento en
// el ledger — cancelGoal() nunca toca rewards_transactions.
test("goals: tras cancelar no queda ningún Goal activo, y el saldo de Points no cambia", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const balanceBefore = await getBalance(sessionClient, userId);

    const { data: goal } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 1000, points_at_goal_creation: 0 })
      .select("id")
      .single();

    const { error: cancelError } = await sessionClient
      .from("goals")
      .update({ status: "cancelled" })
      .eq("id", goal!.id as string)
      .eq("status", "active");
    assert.equal(cancelError, null, cancelError?.message);

    const { data: activeGoal, error: activeGoalError } = await sessionClient
      .from("goals")
      .select("id")
      .eq("status", "active")
      .maybeSingle();
    assert.equal(activeGoalError, null, activeGoalError?.message);
    assert.equal(activeGoal, null, "no debe quedar ningún Goal con status='active' tras cancelar");

    const balanceAfter = await getBalance(sessionClient, userId);
    assert.equal(balanceAfter, balanceBefore, "cancelar un Goal no debe generar ninguna transacción de Points");
  } finally {
    await deleteTestUser(userId);
  }
});
