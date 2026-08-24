// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Tests de createGoal() y del
// trigger `set_goal_points_at_creation()`.
//
// `createGoal()` usa `createSessionClient()` (lib/supabase/server.ts,
// depende de `next/headers`) — solo funciona dentro de una petición real
// de Next.js, NO en un test de `node:test` plano (mismo motivo exacto
// que `get-wallet-balance.ts`/`app/search/actions.test.ts` documentan
// para el resto del proyecto: "solo observable dentro de una petición
// real"). Por eso:
// - Los dos casos de VALIDACIÓN DE INPUT (título vacío, targetPoints<=0)
//   SÍ se prueban llamando a `createGoal()` directamente — esas
//   comprobaciones ocurren en código puro, ANTES de tocar
//   `createSessionClient()`.
// - El resto (creación real, único Goal activo, el trigger) se prueba
//   contra Supabase DIRECTAMENTE con un cliente de sesión real
//   (`@supabase/supabase-js` tras `signUp()`, que mantiene el JWT en
//   memoria y lo envía en cada request — sin pasar por `next/headers`),
//   mismo patrón ya usado en `get-rewards-catalog.test.ts` para RLS.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createGoal } from "./create-goal";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `bloque1-goal-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

// ── Validación de input: código puro, no toca Supabase, sí testeable directamente ──
test("createGoal: título vacío se rechaza server-side, sin tocar Supabase", async () => {
  const result = await createGoal({ title: "   ", targetPoints: 100 });
  assert.equal(result.outcome, "invalid_input");
});

test("createGoal: targetPoints <= 0 se rechaza server-side, sin tocar Supabase", async () => {
  const result = await createGoal({ title: "Roma", targetPoints: 0 });
  assert.equal(result.outcome, "invalid_input");
});

// ── Creación real y único Goal activo — probado directamente contra Supabase ──
test("goals: un usuario puede crear un Goal activo real", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { data, error } = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 10_000, points_at_goal_creation: 0 })
      .select("id, status")
      .single();

    assert.equal(error, null, error?.message);
    assert.equal(data!.status, "active");
  } finally {
    await deleteTestUser(userId);
  }
});

test("goals: un segundo Goal mientras el primero sigue activo se rechaza (23505, goals_one_active_per_user_idx)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const first = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Roma", target_points: 10_000, points_at_goal_creation: 0 });
    assert.equal(first.error, null);

    const second = await sessionClient
      .from("goals")
      .insert({ user_id: userId, title: "Tokio", target_points: 20_000, points_at_goal_creation: 0 });

    assert.ok(second.error, "el índice único parcial debe rechazar un segundo Goal activo");
    assert.equal(second.error!.code, "23505");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 9. points_at_goal_creation no puede ser manipulado por el cliente ──
test("goals: points_at_goal_creation se sobrescribe SIEMPRE con el saldo real, ignorando cualquier valor enviado por el cliente", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    await grantPoints(userId, 777);
    const realBalance = await getBalance(userId);

    const { data, error } = await sessionClient
      .from("goals")
      .insert({
        user_id: userId,
        title: "Intento de manipulación",
        target_points: 100,
        points_at_goal_creation: 999_999_999,
      })
      .select("points_at_goal_creation")
      .single();

    assert.equal(error, null, error?.message);
    assert.equal(
      data!.points_at_goal_creation,
      realBalance,
      "el trigger debe sobrescribir con el saldo REAL, nunca aceptar el valor enviado por el cliente",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// RLS: un usuario no puede insertar un Goal a nombre de otro.
test("goals: el cliente no puede insertar un Goal con user_id distinto al propio (WITH CHECK)", async () => {
  const { userId: attacker, sessionClient } = await signUpUser();
  const { userId: victim } = await signUpUser();
  try {
    const { error } = await sessionClient
      .from("goals")
      .insert({ user_id: victim, title: "Suplantación", target_points: 100, points_at_goal_creation: 0 });

    assert.ok(error, "WITH CHECK (user_id = auth.uid()) debe rechazar esto");
  } finally {
    await deleteTestUser(attacker);
    await deleteTestUser(victim);
  }
});
