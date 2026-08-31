// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Tests de redeemReward()/redeem_reward().
// Usuario real vía signUp + createServiceRoleClient (mismo patrón exacto
// que lib/security/rate-limit-concurrency.test.ts) — nunca simulado. Los
// tests de concurrencia usan Promise.all con llamadas REALES al RPC
// contra Supabase local, con una garantía ESTRICTA (exactamente 1 éxito),
// a diferencia del rate-limit (que documenta una cota superior
// aceptada, no una garantía exacta).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "./redeem-reward";
import { markRedemptionFulfilled } from "./mark-redemption-fulfilled";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `bloque1-redeem-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "bloque1-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.user);

  return { userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number) {
  const service = createServiceRoleClient();
  const { error } = await service
    .from("rewards_transactions")
    .insert({ user_id: userId, amount, type: "earned", reason: "bloque1_test_earning" });
  assert.equal(error, null, `no se pudo otorgar Points de prueba: ${error?.message}`);
}

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("rewards_transactions")
    .select("amount")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

interface CreateRewardOptions {
  pointsCost: number;
  fundingType?: "viao" | "partner";
  realCostEur?: number;
  active?: boolean;
  limitPerUser?: number;
}

async function createTestReward(options: CreateRewardOptions): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({
      title: `Bloque 1 test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points_cost: options.pointsCost,
      funding_type: options.fundingType ?? "partner",
      real_cost_eur: options.realCostEur ?? null,
      active: options.active ?? true,
      limit_per_user: options.limitPerUser ?? null,
    })
    .select("id")
    .single();
  assert.equal(error, null, `no se pudo crear el Reward de prueba: ${error?.message}`);
  return data!.id as string;
}

// rewards_catalog no concede DELETE a ningún rol (mismo criterio "nunca
// borrar" ya aplicado al resto de tablas tipo ledger/catálogo del
// proyecto): la única forma de retirar una fila de prueba es active=false,
// la misma que usaría el producto real para retirar un Reward (ya
// filtrado por getRewardsCatalog() y por redeem_reward()). Evita que cada
// ejecución de la suite deje basura permanente y creciente en el catálogo
// real.
async function deactivateTestReward(rewardId: string) {
  const service = createServiceRoleClient();
  await service.from("rewards_catalog").update({ active: false }).eq("id", rewardId);
}

// ── 1. Canje exitoso ──
test("redeemReward: con saldo suficiente, descuenta correctamente y devuelve un código único", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId); // incluye el bono de registro (100), no se asume un valor fijo
    await grantPoints(userId, 1000);
    rewardId = await createTestReward({ pointsCost: 400 });

    const result = await redeemReward(userId, rewardId, crypto.randomUUID());

    assert.equal(result.outcome, "success");
    if (result.outcome !== "success") return;
    assert.equal(result.redemption.pointsSpent, 400);
    assert.equal(result.redemption.status, "pending");
    assert.ok(result.redemption.redemptionCode.length > 0);

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 1000 - 400);
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 2. Saldo insuficiente ──
test("redeemReward: saldo insuficiente no modifica el ledger ni crea redención", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    await grantPoints(userId, 100);
    rewardId = await createTestReward({ pointsCost: 100_000 });

    const balanceBefore = await getBalance(userId);
    const result = await redeemReward(userId, rewardId, crypto.randomUUID());

    assert.equal(result.outcome, "insufficient_balance");
    const balanceAfter = await getBalance(userId);
    assert.equal(balanceBefore, balanceAfter, "el saldo no debe cambiar si el canje falla");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── Reward inactivo ──
test("redeemReward: un Reward inactivo no puede canjearse", async () => {
  const { userId } = await signUpUser();
  try {
    await grantPoints(userId, 1000);
    // Ya se crea con active:false — nada que desactivar después, no deja
    // ninguna fila activa en el catálogo.
    const rewardId = await createTestReward({ pointsCost: 100, active: false });

    const result = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(result.outcome, "reward_not_available");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Reward inexistente ──
test("redeemReward: un reward_catalog_id inexistente se rechaza igual que uno inactivo", async () => {
  const { userId } = await signUpUser();
  try {
    await grantPoints(userId, 1000);
    const result = await redeemReward(userId, crypto.randomUUID(), crypto.randomUUID());
    assert.equal(result.outcome, "reward_not_available");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 3. Idempotencia ──
test("redeemReward: reintentar con el MISMO attemptId nunca descuenta dos veces", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId);
    await grantPoints(userId, 1000);
    rewardId = await createTestReward({ pointsCost: 300 });
    const attemptId = crypto.randomUUID();

    const first = await redeemReward(userId, rewardId, attemptId);
    const second = await redeemReward(userId, rewardId, attemptId);

    assert.equal(first.outcome, "success");
    assert.equal(second.outcome, "success");
    if (first.outcome !== "success" || second.outcome !== "success") return;
    assert.equal(first.redemption.id, second.redemption.id, "debe devolver la MISMA redención, nunca una nueva");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 1000 - 300, "descontado UNA sola vez, a pesar de dos llamadas con el mismo attemptId");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── limit_per_user ──
test("redeemReward: limit_per_user impide un segundo canje del mismo Reward al alcanzar el límite", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    await grantPoints(userId, 10_000);
    rewardId = await createTestReward({ pointsCost: 100, limitPerUser: 1 });

    const first = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(first.outcome, "success");

    const second = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(second.outcome, "limit_per_user_exceeded");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// Fase D (auditoría independiente del Bloque 1, sección F) — el test
// anterior solo cubre una redención `pending` contando para el límite.
// El SQL cuenta `status <> 'cancelled'`, que incluye `fulfilled` — este
// test lo demuestra explícitamente en vez de dejarlo solo inferido
// leyendo el RPC.
test("redeemReward: limit_per_user sigue contando una redención ya fulfilled, no solo pending", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    await grantPoints(userId, 10_000);
    rewardId = await createTestReward({ pointsCost: 100, limitPerUser: 1 });

    const first = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(first.outcome, "success");
    if (first.outcome !== "success") return;

    const fulfillResult = await markRedemptionFulfilled(userId, first.redemption.id);
    assert.equal(fulfillResult.success, true);

    const second = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(second.outcome, "limit_per_user_exceeded", "una redención fulfilled sigue contando contra el límite, igual que una pending");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 4. Concurrencia real: EXACTAMENTE 1 éxito, nunca saldo negativo ──
test("redeemReward: N intentos concurrentes reales para el mismo saldo exacto -> exactamente 1 éxito, saldo nunca negativo", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    // Saldo EXACTO para 1 sola redención — si el lock fallara, más de
    // una llamada concurrente "vería" saldo suficiente.
    const startingBalance = await getBalance(userId);
    const rewardCost = 500;
    await grantPoints(userId, rewardCost);
    rewardId = await createTestReward({ pointsCost: rewardCost });
    const rewardIdForConcurrentCalls = rewardId;

    const CONCURRENT_CALLS = 10;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () =>
        redeemReward(userId, rewardIdForConcurrentCalls, crypto.randomUUID()),
      ),
    );

    const successes = results.filter((r) => r.outcome === "success");
    const insufficientBalance = results.filter((r) => r.outcome === "insufficient_balance");

    assert.equal(successes.length, 1, `debe haber EXACTAMENTE 1 éxito, hubo ${successes.length}`);
    assert.equal(
      insufficientBalance.length,
      CONCURRENT_CALLS - 1,
      "el resto debe fallar por saldo insuficiente, nunca por otro motivo",
    );

    const finalBalance = await getBalance(userId);
    assert.equal(
      finalBalance,
      startingBalance + rewardCost - rewardCost,
      "el saldo final debe reflejar exactamente UN descuento, nunca negativo ni descontado más de una vez",
    );
    assert.ok(finalBalance >= 0, "el saldo nunca puede quedar negativo");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 5. Kill-switch ──
test("redeemReward: un Reward VIAO-financiado cuyo real_cost_eur supera el techo mensual restante es rechazado (pool_exhausted)", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId);
    await grantPoints(userId, 100_000);
    // El techo configurado en la función SQL es 100.00€ — un único
    // Reward con real_cost_eur=150 lo supera de inmediato, sin necesitar
    // canjes previos para agotar el pool. `pointsCost` se elige alto
    // (Fase D: constraint del 30%, 20260824091000_*.sql) únicamente para
    // que 150€ siga siendo ≤30% de su valor nominal — no cambia qué
    // prueba este test (el techo mensual, no la regla del 30%).
    rewardId = await createTestReward({
      pointsCost: 100_000,
      fundingType: "viao",
      realCostEur: 150,
    });

    const result = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(result.outcome, "pool_exhausted");

    const balanceAfter = await getBalance(userId);
    // Nada debe descontarse si el kill-switch bloquea el canje.
    assert.equal(balanceAfter, balanceBefore + 100_000, "sin ningún descuento");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 6. Pool concurrente ──
//
// `rewards_catalog`/`reward_redemptions` NUNCA reciben GRANT de DELETE
// para `service_role` (mismo patrón deliberado que el resto del
// proyecto: "nunca borrar una fila de un ledger/catálogo") — cualquier
// Reward VIAO-financiado que este test canjee con éxito queda
// PERMANENTEMENTE contando contra el pool real del mes en ejecuciones
// futuras de la suite. Por eso el test consulta el REMANENTE real del
// pool en el momento de ejecutarse (nunca asume que empieza en 0€) y
// calcula los importes de prueba en función de ese remanente — sigue
// siendo válido sin importar cuántas veces se haya ejecutado antes.
async function getPoolSpentThisMonth(): Promise<number> {
  const service = createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data } = await service
    .from("reward_redemptions")
    .select("reward_catalog_id, status, created_at, rewards_catalog!inner(funding_type, real_cost_eur)")
    .neq("status", "cancelled")
    .gte("created_at", startOfMonth.toISOString());

  return (data ?? [])
    .filter((row) => (row.rewards_catalog as unknown as { funding_type: string }).funding_type === "viao")
    .reduce(
      (sum, row) => sum + Number((row.rewards_catalog as unknown as { real_cost_eur: string }).real_cost_eur),
      0,
    );
}

test("redeemReward: dos usuarios canjeando Rewards VIAO a la vez nunca superan el techo mensual por una carrera", async () => {
  const { userId: userA } = await signUpUser();
  const { userId: userB } = await signUpUser();
  let rewardA: string | undefined;
  let rewardB: string | undefined;
  try {
    await grantPoints(userA, 100_000);
    await grantPoints(userB, 100_000);

    const monthlyLimitEur = 100.0; // debe coincidir con v_monthly_pool_limit_eur del RPC
    const alreadySpent = await getPoolSpentThisMonth();
    const remaining = monthlyLimitEur - alreadySpent;

    if (remaining <= 0.02) {
      // El pool real de este mes ya está agotado por ejecuciones
      // anteriores de esta misma suite (esperado con el tiempo, dado que
      // no hay DELETE) — el propio kill-switch ya está demostrado por el
      // test anterior; aquí solo se puede confirmar que NINGÚN canje
      // VIAO-financiado tiene éxito mientras el pool siga agotado, que es
      // el comportamiento correcto, no un fallo del test. `pointsCost:
      // 1000` (no 100) por la misma razón de la rama de abajo: mantiene
      // real_cost_eur=1 dentro del 30% de su valor nominal (10€) — CORE-4
      // corrigió este valor porque la combinación original (pointsCost:
      // 100, realCostEur: 1 => ratio 100%) violaba
      // rewards_catalog_viao_real_cost_within_30_percent y dejaba una fila
      // permanentemente activa e indesactivable (mismo defecto que las 3
      // fixtures históricas de antes de esa constraint).
      rewardA = await createTestReward({ pointsCost: 1000, fundingType: "viao", realCostEur: 1 });
      const result = await redeemReward(userA, rewardA, crypto.randomUUID());
      assert.equal(result.outcome, "pool_exhausted");
      return;
    }

    // Cada mitad individualmente cabe en el remanente; juntas lo superan
    // — si el advisory lock del pool no funcionara, ambas podrían
    // "colarse" a la vez viendo el mismo remanente todavía disponible.
    const eachCost = Number((remaining / 2 + 0.01).toFixed(2));
    // Fase D: constraint del 30% (20260824091000_*.sql) — pointsCost se
    // calcula a partir de eachCost (con margen) para que real_cost_eur
    // siga siendo ≤30% de su valor nominal, sin cambiar qué prueba este
    // test (la carrera sobre el pool, no la regla del 30%).
    const pointsCostForRatio = Math.ceil((eachCost / 0.3) * 100) + 1000;
    rewardA = await createTestReward({ pointsCost: pointsCostForRatio, fundingType: "viao", realCostEur: eachCost });
    rewardB = await createTestReward({ pointsCost: pointsCostForRatio, fundingType: "viao", realCostEur: eachCost });

    const [resultA, resultB] = await Promise.all([
      redeemReward(userA, rewardA, crypto.randomUUID()),
      redeemReward(userB, rewardB, crypto.randomUUID()),
    ]);

    const outcomes = [resultA.outcome, resultB.outcome];
    const successCount = outcomes.filter((o) => o === "success").length;
    const poolExhaustedCount = outcomes.filter((o) => o === "pool_exhausted").length;

    assert.equal(successCount, 1, `debe haber EXACTAMENTE 1 éxito entre los dos usuarios, hubo ${successCount}`);
    assert.equal(poolExhaustedCount, 1, "el otro debe fallar por pool_exhausted, nunca ambos tener éxito");
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    if (rewardA) await deactivateTestReward(rewardA);
    if (rewardB) await deactivateTestReward(rewardB);
  }
});

// ── Reward sin real_cost_eur (defensa en profundidad, no debería ocurrir por la constraint de la tabla) ──
test("redeemReward: fail-closed — nunca asume coste cero si real_cost_eur faltara para un Reward viao-financiado", async () => {
  const { userId } = await signUpUser();
  try {
    await grantPoints(userId, 1000);
    const service = createServiceRoleClient();
    // Se inserta sin pasar por createTestReward para intentar sortear la
    // constraint (aunque no debería ser posible: la tabla ya exige
    // real_cost_eur cuando funding_type='viao').
    const { error } = await service
      .from("rewards_catalog")
      .insert({ title: "Reward sin coste real", points_cost: 100, funding_type: "viao", real_cost_eur: null });

    assert.ok(error, "la propia constraint de la tabla debe impedir esta fila — confirma el fail-closed a nivel de schema");
  } finally {
    await deleteTestUser(userId);
  }
});
