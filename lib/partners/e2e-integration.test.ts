// Bloque Partners PB7 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — E2E /
// integración completa. Este archivo NO repite lo que PB2/PB4/PB6 ya
// prueban de forma aislada (idempotencia del RPC, kill-switches del RPC,
// cálculo de agregados del Dashboard) — prueba que esas piezas
// REALMENTE SE CONECTAN entre sí, usando siempre la capa de aplicación
// real (`registerQrActivity`/`registerReservationActivity` de PB4,
// `getPartnerDashboard` de PB6), nunca llamando al RPC directamente como
// atajo.
//
// Goals: `getActiveGoal()`/`getWalletBalance()` dependen de
// `next/headers` (sesión de cookies), no invocables fuera de una
// petición real de Next.js — mismo criterio ya establecido por los
// propios tests de Goals (ni get-goal.test.ts ni cancel-goal.test.ts
// llaman a getActiveGoal()/cancelGoal() directamente). Este archivo
// sigue exactamente esa misma convención: crea la fila de `goals` y lee
// `rewards_wallets` con el CLIENTE DE SESIÓN del propio usuario de
// prueba (nunca `service_role`) — verificado directamente contra
// Postgres (`\dp goals`, `\dp rewards_wallets`) que `service_role` no
// tiene ningún GRANT sobre ninguna de las dos (Patrón A, RLS de
// `authenticated`) — y llama a `calculateGoalProgressPercent()` — la
// función pura real, sin next/headers — para verificar el progreso.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { registerQrActivity, registerReservationActivity } from "./register-partner-activity";
import { getPartnerDashboard } from "./get-partner-dashboard";
import { calculateGoalProgressPercent } from "../goals/calculate-progress";
import { completeMission } from "../missions/complete-mission";

const MONTHLY_POOL_LIMIT_POINTS = 3000;

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partners-pb7-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partners-pb7-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(): Promise<{ id: string; accessToken: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Test Partner PB7 ${suffix}`, slug: `test-partner-pb7-${suffix}`, category: "restaurant", is_test: true })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string };
}

function newAttemptId(): string {
  return crypto.randomUUID();
}

/**
 * Lee `rewards_wallets` DIRECTAMENTE (la misma vista que usa
 * getWalletBalance() en producción) — vía el cliente de SESIÓN, nunca
 * service_role: verificado contra Postgres real (`\dp rewards_wallets`)
 * que `service_role` NO tiene ningún GRANT sobre esta vista (Patrón A,
 * mismo criterio ya documentado en get-wallet-balance.ts) — un error de
 * mi primer intento de este archivo, no un defecto de Partners.
 */
async function getWalletBalanceReal(sessionClient: SupabaseClient): Promise<number> {
  const { data } = await sessionClient.from("rewards_wallets").select("balance").maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

/**
 * Crea un Goal real vía INSERT con el cliente de SESIÓN (nunca
 * service_role: verificado contra Postgres real que `service_role` no
 * tiene GRANT sobre `goals`, Patrón A) — dispara los mismos triggers
 * SECURITY DEFINER (set_goal_points_at_creation,
 * cancel_active_goal_before_insert) que create-goal.ts en producción.
 */
async function createRealGoal(sessionClient: SupabaseClient, targetPoints: number): Promise<string> {
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  const { data, error } = await sessionClient
    .from("goals")
    .insert({ user_id: user!.id, title: "Viaje de prueba E2E PB7", target_points: targetPoints, points_at_goal_creation: 0 })
    .select("id")
    .single();
  assert.equal(error, null, `crear Goal de test falló: ${error?.message}`);
  return data!.id as string;
}

async function getPartnerPoolSpentThisMonth(): Promise<number> {
  const service = createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { data } = await service
    .from("partner_activities")
    .select("points_awarded")
    .gte("created_at", startOfMonth.toISOString());
  return (data ?? []).reduce((sum, row) => sum + (row.points_awarded as number), 0);
}

async function getMissionsPoolSpentThisMonth(): Promise<number> {
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

// ══════════════════════════ QR — loop completo ══════════════════════════
test("E2E QR: partner_activities -> rewards_transactions -> rewards_wallets -> Goal, con Points reales (P2)", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const goalId = await createRealGoal(sessionClient, 50);

    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 10);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 10, "10€ declared * P2 (1 Point/€) = 10 Points");

    // 1. partner_activities
    const service = createServiceRoleClient();
    const { data: activity } = await service
      .from("partner_activities")
      .select("attribution_mechanism, amount_confidence")
      .eq("id", result.activity.activityId)
      .single();
    assert.equal(activity!.attribution_mechanism, "qr");
    assert.equal(activity!.amount_confidence, "declared");

    // 2. rewards_transactions
    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("reason, reference_type, reference_id, amount")
      .eq("reference_type", "partner_activity")
      .eq("reference_id", result.activity.activityId)
      .single();
    assert.equal(transaction!.reason, "partner_activity");
    assert.equal(transaction!.amount, 10);

    // 3. rewards_wallets (la VIEW real, no una suma reimplementada)
    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 10, "rewards_wallets debe reflejar el saldo tras la Actividad QR");

    // 4. Goal (WALLET_BALANCE, función pura real)
    const progress = calculateGoalProgressPercent(balanceAfter, 50);
    assert.equal(progress, Math.min(100, Math.round((balanceAfter / 50) * 100)));
    assert.ok(progress > 0, "el Goal debe reflejar progreso tras la Actividad QR");

    const { data: goalRow } = await sessionClient.from("goals").select("status").eq("id", goalId).single();
    assert.equal(goalRow!.status, "active", "el Goal sigue activo, la Actividad Partner no lo modifica directamente");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Reserva — loop completo ══════════════════════════
test("E2E Reserva: partner_activities -> rewards_transactions -> rewards_wallets -> Goal, con Points reales (P1)", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    await createRealGoal(sessionClient, 100);

    const result = await registerReservationActivity(userId, partner.accessToken, newAttemptId(), 10, "Mesa 2, 20:00");
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 20, "10€ confirmed_by_reservation * P1 (2 Points/€) = 20 Points");

    const service = createServiceRoleClient();
    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("amount")
      .eq("reference_type", "partner_activity")
      .eq("reference_id", result.activity.activityId)
      .single();
    assert.equal(transaction!.amount, 20);

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 20, "rewards_wallets debe reflejar el saldo tras la Reserva");

    const progress = calculateGoalProgressPercent(balanceAfter, 100);
    assert.equal(progress, Math.min(100, Math.round((balanceAfter / 100) * 100)));
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ QR y Reserva no se cruzan (mismo usuario, mismo importe, tasas distintas) ══════════════════════════
test("E2E: 10€ por QR (declared) y 10€ por Reserva (confirmed_by_reservation) producen 10 y 20 Points respectivamente, nunca intercambiados", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partnerQr = await createTestPartner();
  const partnerReservation = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);

    const qrResult = await registerQrActivity(userId, partnerQr.accessToken, newAttemptId(), 10);
    const reservationResult = await registerReservationActivity(userId, partnerReservation.accessToken, newAttemptId(), 10);

    assert.equal(qrResult.outcome, "registered");
    assert.equal(reservationResult.outcome, "registered");
    if (qrResult.outcome !== "registered" || reservationResult.outcome !== "registered") return;

    assert.equal(qrResult.activity.pointsAwarded, 10, "QR con el mismo importe (10€) nunca debe dar 20 Points");
    assert.equal(reservationResult.activity.pointsAwarded, 20, "Reserva con el mismo importe (10€) nunca debe dar 10 Points");

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 30, "el Wallet debe sumar 10 + 20 = 30 exactamente, ambas tasas aplicadas correctamente");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Idempotencia E2E (vía capa de aplicación) ══════════════════════════
test("E2E idempotencia: repetir el mismo attemptId vía registerQrActivity() nunca duplica el crédito en rewards_wallets", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const attemptId = newAttemptId();

    const first = await registerQrActivity(userId, partner.accessToken, attemptId, 6);
    const second = await registerQrActivity(userId, partner.accessToken, attemptId, 6);
    assert.equal(first.outcome, "registered");
    assert.equal(second.outcome, "registered");
    if (first.outcome !== "registered" || second.outcome !== "registered") return;
    assert.equal(first.activity.activityId, second.activity.activityId);

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 6, "un único crédito real en rewards_wallets, pese a dos llamadas de aplicación con el mismo attemptId");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Kill-switch P3 E2E ══════════════════════════
test("E2E P3: la 3ª Actividad del día se bloquea sin afectar rewards_transactions ni rewards_wallets", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    const balanceBeforeThird = await getWalletBalanceReal(sessionClient);

    const third = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    assert.equal(third.outcome, "daily_limit_exceeded");

    const balanceAfterThird = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfterThird, balanceBeforeThird, "el rechazo de P3 no debe alterar rewards_wallets");

    const service = createServiceRoleClient();
    const { data: activities } = await service
      .from("partner_activities")
      .select("id")
      .eq("user_id", userId)
      .eq("partner_id", partner.id);
    assert.equal(activities?.length, 2, "exactamente 2 Actividades, ninguna fila parcial para la 3ª");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Pool P4/P5 E2E ══════════════════════════
test("E2E P4/P5: pool agotado -> Actividad visible en partner_activities y en el Dashboard, sin crédito en rewards_wallets, sin backfill", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  const fillerPartner = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const alreadySpent = await getPartnerPoolSpentThisMonth();
    const remaining = MONTHLY_POOL_LIMIT_POINTS - alreadySpent;
    const fillerNeeded = remaining - 5;
    if (fillerNeeded > 0) {
      const { error } = await service.from("partner_activities").insert({
        partner_id: fillerPartner.id,
        user_id: userId,
        attribution_mechanism: "qr",
        declared_amount_eur: 1,
        amount_confidence: "declared",
        points_awarded: fillerNeeded,
        attempt_id: newAttemptId(),
      });
      assert.equal(error, null, error?.message);
    }

    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 10);

    assert.equal(result.outcome, "registered", "P5: sin margen, la Actividad se registra igualmente");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 0);

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore, "rewards_wallets no debe cambiar cuando points_awarded=0");

    // Puente PB4 -> PB6: la Actividad debe ser visible en el Dashboard.
    const dashboard = await getPartnerDashboard(partner.id);
    const activityInDashboard = dashboard.actividadReciente.find((a) => a.declaredAmountEur === 10);
    assert.ok(activityInDashboard, "la Actividad con 0 Points debe aparecer en actividad_reciente del Dashboard");
    assert.equal(activityInDashboard!.pointsAwarded, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Concurrencia E2E (vía capa de aplicación) ══════════════════════════
test("E2E concurrencia: llamadas concurrentes reales a registerQrActivity() nunca superan P3 ni duplican rewards_wallets", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => registerQrActivity(userId, partner.accessToken, newAttemptId(), 1)),
    );

    const succeeded = results.filter((r) => r.outcome === "registered");
    assert.equal(succeeded.length, 2, "bajo concurrencia real vía la capa de aplicación, exactamente 2 de 6 deben tener éxito (P3)");

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 2, "rewards_wallets debe reflejar exactamente 2 créditos de 1 Point, ni más ni menos");
  } finally {
    await deleteTestUser(userId);
  }
});

test("E2E concurrencia: mismo attemptId concurrente vía registerQrActivity() -> un único crédito en rewards_wallets", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const attemptId = newAttemptId();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => registerQrActivity(userId, partner.accessToken, attemptId, 4)),
    );

    for (const r of results) {
      assert.equal(r.outcome, "registered");
    }
    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(balanceAfter, balanceBefore + 4, "un único crédito real, pese a 8 llamadas concurrentes con el mismo attemptId");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Independencia Partners / Missions ══════════════════════════
test("E2E independencia: una Actividad Partner no altera el pool de Missions, y una Mission no altera el pool de Partners", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner();
  try {
    // balanceBefore incluye cualquier bono de registro automático — no se
    // asume que un usuario nuevo empieza en 0 (mismo criterio ya usado en
    // complete-mission.test.ts).
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const missionsPoolBefore = await getMissionsPoolSpentThisMonth();
    const partnersPoolBefore = await getPartnerPoolSpentThisMonth();

    const partnerResult = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 3);
    assert.equal(partnerResult.outcome, "registered");
    if (partnerResult.outcome !== "registered") return;

    const missionsPoolAfterPartner = await getMissionsPoolSpentThisMonth();
    assert.equal(missionsPoolAfterPartner, missionsPoolBefore, "una Actividad de Partner no debe mover el pool de Missions");

    const missionResult = await completeMission(userId, "return_visit");
    assert.equal(missionResult.outcome, "completed");
    if (missionResult.outcome !== "completed") return;

    const partnersPoolAfterMission = await getPartnerPoolSpentThisMonth();
    assert.equal(
      partnersPoolAfterMission,
      partnersPoolBefore + partnerResult.activity.pointsAwarded,
      "completar una Mission no debe mover el pool de Partners (solo debe reflejar la Actividad Partner ya registrada)",
    );

    // El ledger sí es compartido (LOCKED, L7) — ambos movimientos deben
    // convivir en rewards_transactions con reason distinto, sin mezclarse.
    const service = createServiceRoleClient();
    const { data: transactions } = await service
      .from("rewards_transactions")
      .select("reason, amount")
      .eq("user_id", userId)
      .in("reason", ["partner_activity", "mission:return_visit"]);
    assert.equal(transactions?.length, 2, "una transacción de cada dominio, ambas en el mismo ledger único");

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(
      balanceAfter,
      balanceBefore + partnerResult.activity.pointsAwarded + missionResult.pointsAwarded,
      "rewards_wallets debe sumar correctamente Points de Partners y de Missions sobre el saldo previo (incl. bono de registro)",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ Aislamiento Partner A/B en el flujo completo ══════════════════════════
test("E2E aislamiento: el Dashboard de A y B no se contaminan, pero rewards_wallets del usuario suma correctamente ambos Partners", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partnerA = await createTestPartner();
  const partnerB = await createTestPartner();
  try {
    const balanceBefore = await getWalletBalanceReal(sessionClient);
    const resultA = await registerQrActivity(userId, partnerA.accessToken, newAttemptId(), 7);
    const resultB = await registerReservationActivity(userId, partnerB.accessToken, newAttemptId(), 7);
    assert.equal(resultA.outcome, "registered");
    assert.equal(resultB.outcome, "registered");
    if (resultA.outcome !== "registered" || resultB.outcome !== "registered") return;

    const dashboardA = await getPartnerDashboard(partnerA.id);
    const dashboardB = await getPartnerDashboard(partnerB.id);
    assert.equal(dashboardA.ventasDeclaradasEur, 7, "el dashboard de A solo ve su propia venta declarada");
    assert.equal(dashboardA.ventasConfirmadasReservaEur, 0, "A no debe ver la reserva de B");
    assert.equal(dashboardB.ventasConfirmadasReservaEur, 7, "el dashboard de B solo ve su propia reserva");
    assert.equal(dashboardB.ventasDeclaradasEur, 0, "B no debe ver la venta declarada de A");

    const balanceAfter = await getWalletBalanceReal(sessionClient);
    assert.equal(
      balanceAfter,
      balanceBefore + resultA.activity.pointsAwarded + resultB.activity.pointsAwarded,
      "el Wallet del usuario, a diferencia del Dashboard por Partner, sí suma Points de todos los Partners",
    );
  } finally {
    await deleteTestUser(userId);
  }
});
