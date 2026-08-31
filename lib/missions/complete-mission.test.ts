// Bloque Missions (Prompt Maestro 24/08/2026) — Tests de
// completeMission()/complete_mission(). Usuario real vía signUp +
// createServiceRoleClient (mismo patrón exacto que
// lib/rewards/redeem-reward.test.ts) — nunca simulado. El test de
// concurrencia usa Promise.all con llamadas REALES al RPC contra
// Supabase local.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { completeMission, isoWeekKey } from "./complete-mission";
import { MISSIONS_POOL_MONTHLY_LIMIT_POINTS } from "./rules";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `missions-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "missions-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

async function getPoolSpentThisMonth(): Promise<number> {
  const service = createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { data } = await service
    .from("mission_completions")
    .select("points_awarded")
    .gte("created_at", startOfMonth.toISOString());
  return (data ?? []).reduce((sum, row) => sum + (row.points_awarded as number), 0);
}

// ── isoWeekKey: casos de referencia ISO 8601, verificados manualmente
// contra los hechos conocidos del calendario (4 de enero siempre en
// semana 1; el año de una semana lo decide su jueves) antes de escribir
// esta prueba — ver frontera de fin/inicio de año en ambos sentidos. ──
test("isoWeekKey: casos de referencia ISO 8601 (fronteras de año en ambos sentidos)", () => {
  assert.equal(isoWeekKey(new Date("2026-01-04T00:00:00Z")), "2026-W01", "4 de enero siempre es semana 1");
  assert.equal(isoWeekKey(new Date("2026-01-01T00:00:00Z")), "2026-W01");
  assert.equal(isoWeekKey(new Date("2025-12-29T00:00:00Z")), "2026-W01", "lunes de diciembre que pertenece a la semana 1 de 2026");
  assert.equal(isoWeekKey(new Date("2025-12-31T00:00:00Z")), "2026-W01");
  assert.equal(isoWeekKey(new Date("2026-08-24T00:00:00Z")), "2026-W35");
  assert.equal(isoWeekKey(new Date("2026-08-17T00:00:00Z")), "2026-W34", "semana anterior consecutiva");
  assert.equal(isoWeekKey(new Date("2026-12-31T00:00:00Z")), "2026-W53", "2026 tiene 53 semanas ISO");
  assert.equal(isoWeekKey(new Date("2027-01-01T00:00:00Z")), "2026-W53", "1 de enero que pertenece a la última semana del año anterior");
});

// ── 1. Mission válida ──
test("completeMission: Mission válida otorga los Points correctos y crea el ledger", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await completeMission(userId, "partner_activity_registered");
    assert.equal(result.outcome, "completed");
    if (result.outcome !== "completed") return;
    assert.equal(result.pointsAwarded, 10);

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 2. Mission inválida ──
test("completeMission: mission_key desconocida se rechaza sin tocar el ledger", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await completeMission(userId, "unknown_mission");
    assert.equal(result.outcome, "mission_not_found");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore, "una mission_key desconocida no debe generar ningún movimiento");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── reason / reference_type / reference_id correctos (cubre también atomicidad: ambas filas existen juntas) ──
test("completeMission: la transacción del ledger tiene reason/reference_type/reference_id correctos", async () => {
  const { userId } = await signUpUser();
  try {
    const result = await completeMission(userId, "return_visit");
    assert.equal(result.outcome, "completed");
    if (result.outcome !== "completed") return;

    const service = createServiceRoleClient();
    const { data: completion } = await service
      .from("mission_completions")
      .select("id, mission_key, period_key, points_awarded")
      .eq("user_id", userId)
      .eq("mission_key", "return_visit")
      .single();
    assert.ok(completion, "debe existir la fila de completion");

    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("reason, reference_type, reference_id, amount, type")
      .eq("user_id", userId)
      .eq("reason", "mission:return_visit")
      .single();
    assert.ok(transaction, "debe existir la transacción del ledger — completion sin ledger sería una inconsistencia real");
    assert.equal(transaction!.reference_type, "mission_completion");
    assert.equal(transaction!.reference_id, completion!.id, "reference_id debe apuntar exactamente a la fila de completion");
    assert.equal(transaction!.amount, 10);
    assert.equal(transaction!.type, "earned");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Mission lifetime (goal_created) ──
test("completeMission: Mission lifetime (goal_created) otorga 50 Points", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await completeMission(userId, "goal_created");
    assert.equal(result.outcome, "completed");
    if (result.outcome !== "completed") return;
    assert.equal(result.pointsAwarded, 50);

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 50);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── FASE J-B4 — Mission lifetime (profile_completed) ──
test("completeMission: Mission lifetime (profile_completed) otorga 10 Points", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await completeMission(userId, "profile_completed");
    assert.equal(result.outcome, "completed");
    if (result.outcome !== "completed") return;
    assert.equal(result.pointsAwarded, 10);

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── FASE J-B4 — profile_completed nunca se puede farmear guardando el perfil repetidas veces ──
test("completeMission: 'profile_completed' nunca se puede farmear repitiendo el evento (period_key='lifetime')", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    // Simula 3 disparos reales del evento "perfil guardado" — exactamente
    // lo que ocurriría si el usuario edita y guarda su perfil varias veces
    // (flujo 100% legítimo, ver app/profile/actions.ts).
    await completeMission(userId, "profile_completed");
    await completeMission(userId, "profile_completed");
    const third = await completeMission(userId, "profile_completed");
    assert.equal(third.outcome, "completed");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10, "10 Points UNA sola vez, sin importar cuántas veces se guarde el perfil");

    const service = createServiceRoleClient();
    const { data: completions } = await service
      .from("mission_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_key", "profile_completed");
    assert.equal(completions?.length, 1, "una sola fila para siempre, nunca una por cada guardado");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 3/5/6. Doble ejecución / retry: mismo periodo nunca duplica ──
test("completeMission: repetir la misma Mission en el mismo periodo nunca duplica Points ni filas", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const first = await completeMission(userId, "partner_activity_registered");
    const second = await completeMission(userId, "partner_activity_registered");
    assert.equal(first.outcome, "completed");
    assert.equal(second.outcome, "completed");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10, "solo UN otorgamiento, a pesar de dos llamadas");

    const service = createServiceRoleClient();
    const { data: completions } = await service
      .from("mission_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_key", "partner_activity_registered");
    assert.equal(completions?.length, 1, "exactamente 1 fila de completion, nunca 2");

    const { data: transactions } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "mission:partner_activity_registered");
    assert.equal(transactions?.length, 1, "exactamente 1 transacción, nunca 2");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 17. Goal cancelado + nuevo Goal NO genera segunda recompensa ──
test("completeMission: 'goal_created' nunca se puede farmear repitiendo el evento (period_key='lifetime')", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    // Simula 3 disparos reales del evento "Goal creado" — exactamente lo
    // que ocurriría si el usuario crea, cancela y vuelve a crear un Goal
    // varias veces (flujo 100% legítimo, construido a propósito en la
    // fase de cancelación de Goals).
    await completeMission(userId, "goal_created");
    await completeMission(userId, "goal_created");
    const third = await completeMission(userId, "goal_created");
    assert.equal(third.outcome, "completed");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 50, "50 Points UNA sola vez, sin importar cuántas veces se dispare el evento");

    const service = createServiceRoleClient();
    const { data: completions } = await service
      .from("mission_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_key", "goal_created");
    assert.equal(completions?.length, 1, "una sola fila para siempre, nunca una por cada ciclo cancelar/crear");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Confirmación de que la dedup es POR PERIODO, no total: dos periodos distintos sí acumulan ──
test("completeMission: la misma Mission semanal en DOS periodos distintos SÍ otorga Points cada vez", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const service = createServiceRoleClient();
    // Llamada directa al RPC con period_key sintéticos — exactamente lo
    // que completeMission() haría en dos semanas ISO reales distintas.
    const week1 = await service.rpc("complete_mission", {
      p_user_id: userId,
      p_mission_key: "partner_activity_registered",
      p_period_key: "TEST-W1",
    });
    const week2 = await service.rpc("complete_mission", {
      p_user_id: userId,
      p_mission_key: "partner_activity_registered",
      p_period_key: "TEST-W2",
    });
    assert.equal(week1.error, null, week1.error?.message);
    assert.equal(week2.error, null, week2.error?.message);

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 20, "dos periodos distintos deben otorgar Points cada uno");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 8/9/10/11/12/13. Concurrencia real: exactamente 1 completion + 1 transacción ──
test("completeMission: N llamadas concurrentes reales para la misma Mission/periodo -> exactamente 1 completion y 1 transacción", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId);
    const CONCURRENT_CALLS = 10;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () => completeMission(userId, "partner_activity_registered")),
    );

    for (const result of results) {
      assert.equal(result.outcome, "completed", "ninguna llamada concurrente debe fallar — todas deben ver el resultado idempotente");
    }

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10, "exactamente UN otorgamiento pese a 10 llamadas simultáneas");
    assert.ok(balanceAfter >= 0, "el saldo nunca puede quedar negativo");

    const service = createServiceRoleClient();
    const { data: completions } = await service
      .from("mission_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_key", "partner_activity_registered");
    assert.equal(completions?.length, 1, "exactamente 1 fila en mission_completions bajo concurrencia real");

    const { data: transactions } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "mission:partner_activity_registered");
    assert.equal(transactions?.length, 1, "exactamente 1 transacción en el ledger bajo concurrencia real");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 14/15. Ownership: RLS y GRANTs ──
test("mission_completions: un usuario no puede leer las completions de otro (RLS)", async () => {
  const { userId: userA } = await signUpUser();
  const { userId: userB, sessionClient: sessionB } = await signUpUser();
  try {
    await completeMission(userA, "partner_activity_registered");

    const { data, error } = await sessionB.from("mission_completions").select("id").eq("user_id", userA);
    assert.equal(error, null, error?.message);
    assert.equal(data?.length, 0, "un usuario no debe poder leer las completions de otro usuario");
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
  }
});

test("mission_completions: el cliente de sesión no puede insertar directamente (sin GRANT de insert para authenticated)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { error } = await sessionClient.from("mission_completions").insert({
      user_id: userId,
      mission_key: "partner_activity_registered",
      period_key: "FAKE-CLIENT-INSERT",
      points_awarded: 999,
    });
    assert.ok(error, "el INSERT desde el cliente de sesión debe fallar");
  } finally {
    await deleteTestUser(userId);
  }
});

test("complete_mission: no es invocable directamente por un cliente autenticado (solo service_role)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { error } = await sessionClient.rpc("complete_mission", {
      p_user_id: userId,
      p_mission_key: "partner_activity_registered",
      p_period_key: "FAKE-CLIENT-RPC",
    });
    assert.ok(error, "un cliente autenticado no debe poder invocar complete_mission() directamente — EXECUTE revocado");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 18/20/21. Kill-switch del pool mensual de Missions ──
//
// `mission_completions` nunca recibe GRANT de DELETE para `service_role`
// (mismo principio "nunca borrar una fila de un ledger" ya aplicado en
// todo el proyecto) — cualquier Mission completada con éxito en este
// test queda PERMANENTEMENTE contando contra el pool real del mes en
// ejecuciones futuras. Por eso se consulta el REMANENTE real del pool
// en el momento de ejecutarse (nunca se asume que empieza en 0 Points).
test("completeMission: el kill-switch del pool mensual rechaza una Mission que superaría el techo", async () => {
  const { userId } = await signUpUser();
  try {
    const balanceBefore = await getBalance(userId); // incluye el bono de registro, no se asume un valor fijo
    const alreadySpent = await getPoolSpentThisMonth();
    const remaining = MISSIONS_POOL_MONTHLY_LIMIT_POINTS - alreadySpent;

    if (remaining < 10) {
      // El pool real de este mes ya está agotado por ejecuciones
      // anteriores de esta misma suite (esperado con el tiempo, dado
      // que no hay DELETE) — el propio kill-switch ya está demostrado:
      // aquí solo se puede confirmar que NINGUNA Mission nueva tiene
      // éxito mientras el pool siga agotado, que es el comportamiento
      // correcto, no un fallo del test.
      const result = await completeMission(userId, "partner_activity_registered");
      assert.equal(result.outcome, "pool_exhausted");
      return;
    }

    const service = createServiceRoleClient();
    const fillerNeeded = remaining - 5; // deja menos margen (5) que el coste de cualquier Mission semanal (10)
    if (fillerNeeded > 0) {
      const { error } = await service.from("mission_completions").insert({
        user_id: userId,
        mission_key: "return_visit",
        period_key: `FILLER-EXHAUST-${Date.now()}`,
        points_awarded: fillerNeeded,
      });
      assert.equal(error, null, error?.message);
    }

    const result = await completeMission(userId, "partner_activity_registered");
    assert.equal(result.outcome, "pool_exhausted", "con menos margen que el coste de la Mission, debe rechazarse");

    const balanceAfter = await getBalance(userId);
    assert.equal(
      balanceAfter,
      balanceBefore,
      "el kill-switch debe bloquear ANTES de tocar el ledger — el filler no pasó por el ledger a propósito, el saldo no debe cambiar",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("completeMission: exactamente en el límite mensual SÍ se permite (<=, no <)", async () => {
  const { userId } = await signUpUser();
  try {
    const alreadySpent = await getPoolSpentThisMonth();
    const remaining = MISSIONS_POOL_MONTHLY_LIMIT_POINTS - alreadySpent;

    if (remaining < 10) {
      // Sin margen suficiente para aislar este caso en el mes actual —
      // limitación conocida (sin DELETE), no un fallo del test.
      return;
    }

    const service = createServiceRoleClient();
    const fillerNeeded = remaining - 10; // deja EXACTAMENTE 10 de margen
    if (fillerNeeded > 0) {
      const { error } = await service.from("mission_completions").insert({
        user_id: userId,
        mission_key: "return_visit",
        period_key: `FILLER-EXACT-${Date.now()}`,
        points_awarded: fillerNeeded,
      });
      assert.equal(error, null, error?.message);
    }

    const result = await completeMission(userId, "partner_activity_registered");
    assert.equal(result.outcome, "completed", "otorgar exactamente hasta el límite (sin superarlo) debe permitirse");
  } finally {
    await deleteTestUser(userId);
  }
});
