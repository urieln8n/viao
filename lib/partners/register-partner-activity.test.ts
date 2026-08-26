// Bloque Partners PB4 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Tests de
// registerQrActivity()/registerReservationActivity(). Usuario real vía
// signUp + createServiceRoleClient (mismo patrón exacto que
// lib/missions/complete-mission.test.ts y
// lib/partners/complete-partner-activity.test.ts) — nunca simulado.
//
// Mismo comportamiento ya aceptado para partners/partner_activities
// (sin GRANT de DELETE, PB1): cada Partner de test creado aquí queda
// permanentemente en la base local.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { registerQrActivity, registerReservationActivity } from "./register-partner-activity";

const MONTHLY_POOL_LIMIT_POINTS = 3000;

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partners-pb4-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partners-pb4-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(status: "active" | "inactive" = "active"): Promise<{ id: string; accessToken: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Test Partner PB4 ${suffix}`, slug: `test-partner-pb4-${suffix}`, category: "restaurant", status })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string };
}

function newAttemptId(): string {
  return crypto.randomUUID();
}

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

async function getActivity(activityId: string) {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("partner_activities")
    .select("attribution_mechanism, amount_confidence, declared_amount_eur, reservation_reference, partner_id, user_id")
    .eq("id", activityId)
    .single();
  return data;
}

async function getPartnersPoolSpentThisMonth(): Promise<number> {
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

// ══════════════════════════ QR ══════════════════════════

test("registerQrActivity: usuario autenticado + Partner válido -> Actividad creada con attribution_mechanism='qr' y amount_confidence='declared'", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 10);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 10, "10€ * 1 Point/€ (P2, declared) = 10 Points");

    const activity = await getActivity(result.activity.activityId);
    assert.ok(activity);
    assert.equal(activity!.attribution_mechanism, "qr");
    assert.equal(activity!.amount_confidence, "declared");
    assert.equal(activity!.declared_amount_eur, 10);
    assert.equal(activity!.partner_id, partner.id);
    assert.equal(activity!.user_id, userId);
  } finally {
    await deleteTestUser(userId);
  }
});

test("registerQrActivity: el ledger recibe la transacción correcta cuando hay emisión", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 5);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 5);
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ RESERVA ══════════════════════════

test("registerReservationActivity: usuario autenticado + Partner válido -> Actividad con attribution_mechanism='reservation' y amount_confidence='confirmed_by_reservation'", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerReservationActivity(userId, partner.accessToken, newAttemptId(), 10, "Mesa 4, 21:00");
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 20, "10€ * 2 Points/€ (P1, confirmed_by_reservation) = 20 Points");

    const activity = await getActivity(result.activity.activityId);
    assert.ok(activity);
    assert.equal(activity!.attribution_mechanism, "reservation");
    assert.equal(activity!.amount_confidence, "confirmed_by_reservation");
    assert.equal(activity!.reservation_reference, "Mesa 4, 21:00");
  } finally {
    await deleteTestUser(userId);
  }
});

test("registerReservationActivity: reservation_reference es opcional (texto libre, no obligatorio)", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerReservationActivity(userId, partner.accessToken, newAttemptId(), 3);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;

    const activity = await getActivity(result.activity.activityId);
    assert.equal(activity!.reservation_reference, null);
  } finally {
    await deleteTestUser(userId);
  }
});

test("registerReservationActivity: el ledger recibe la transacción correcta cuando hay emisión", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getBalance(userId);
    const result = await registerReservationActivity(userId, partner.accessToken, newAttemptId(), 4);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 8, "4€ * 2 Points/€ = 8 Points");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ SEPARACIÓN QR / RESERVA ══════════════════════════

test("Separación: registerQrActivity nunca puede producir amount_confidence='confirmed_by_reservation' (tasa de Reserva), sin importar el importe", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 100);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    // Si QR pudiera colarse como confirmed_by_reservation, 100€ darían
    // 200 Points (P1) en vez de 100 (P2) — la tasa demuestra la
    // separación tan bien como la columna directamente.
    assert.equal(result.activity.pointsAwarded, 100, "QR siempre aplica P2 (1 Point/€), nunca P1");

    const activity = await getActivity(result.activity.activityId);
    assert.equal(activity!.amount_confidence, "declared");
    assert.equal(activity!.attribution_mechanism, "qr");
  } finally {
    await deleteTestUser(userId);
  }
});

test("Separación: registerReservationActivity nunca puede producir amount_confidence='declared' (tasa de QR), sin importar el importe", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerReservationActivity(userId, partner.accessToken, newAttemptId(), 100);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 200, "Reserva siempre aplica P1 (2 Points/€), nunca P2");

    const activity = await getActivity(result.activity.activityId);
    assert.equal(activity!.amount_confidence, "confirmed_by_reservation");
    assert.equal(activity!.attribution_mechanism, "reservation");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ USUARIO ══════════════════════════

test("registerQrActivity: la Actividad queda asociada exactamente al userId resuelto por el llamante, nunca a otro", async () => {
  const { userId: userA } = await signUpUser();
  const { userId: userB } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerQrActivity(userA, partner.accessToken, newAttemptId(), 1);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;

    const activity = await getActivity(result.activity.activityId);
    assert.equal(activity!.user_id, userA);
    assert.notEqual(activity!.user_id, userB, "la Actividad nunca debe asociarse a un usuario distinto del resuelto por el llamante");
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
  }
});

test("registerQrActivity: importe inválido (<=0) se rechaza sin llamar al RPC ni crear ninguna fila", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 0);
    assert.equal(result.outcome, "invalid_amount");

    const service = createServiceRoleClient();
    const { data } = await service.from("partner_activities").select("id").eq("user_id", userId);
    assert.equal(data?.length, 0, "un importe inválido no debe dejar ninguna fila, ni siquiera parcial");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ PARTNER ══════════════════════════

test("registerQrActivity: access_token inválido/inexistente -> partner_access_denied, sin crear ninguna fila", async () => {
  const { userId } = await signUpUser();
  try {
    const result = await registerQrActivity(userId, crypto.randomUUID(), newAttemptId(), 10);
    assert.equal(result.outcome, "partner_access_denied");

    const service = createServiceRoleClient();
    const { data } = await service.from("partner_activities").select("id").eq("user_id", userId);
    assert.equal(data?.length, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

test("Aislamiento: el access_token del Partner A nunca puede registrar una Actividad para el Partner B (ni al revés)", async () => {
  const { userId } = await signUpUser();
  const partnerA = await createTestPartner();
  const partnerB = await createTestPartner();
  try {
    const result = await registerQrActivity(userId, partnerA.accessToken, newAttemptId(), 1);
    assert.equal(result.outcome, "registered");
    if (result.outcome !== "registered") return;

    const activity = await getActivity(result.activity.activityId);
    assert.equal(activity!.partner_id, partnerA.id);
    assert.notEqual(activity!.partner_id, partnerB.id, "el access_token de A jamás debe resolver una Actividad para B");
  } finally {
    await deleteTestUser(userId);
  }
});

test("registerQrActivity: Partner 'inactive' -> partner_access_denied, mismo comportamiento definido en PB3", async () => {
  const { userId } = await signUpUser();
  const inactivePartner = await createTestPartner("inactive");
  try {
    const result = await registerQrActivity(userId, inactivePartner.accessToken, newAttemptId(), 10);
    assert.equal(result.outcome, "partner_access_denied");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ IDEMPOTENCIA ══════════════════════════

test("registerQrActivity: repetir el mismo attemptId nunca duplica la Actividad ni los Points", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const balanceBefore = await getBalance(userId);
    const attemptId = newAttemptId();

    const first = await registerQrActivity(userId, partner.accessToken, attemptId, 7);
    const second = await registerQrActivity(userId, partner.accessToken, attemptId, 7);
    assert.equal(first.outcome, "registered");
    assert.equal(second.outcome, "registered");
    if (first.outcome !== "registered" || second.outcome !== "registered") return;
    assert.equal(first.activity.activityId, second.activity.activityId, "el reintento debe devolver exactamente la misma Actividad");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 7, "solo UN otorgamiento, a pesar de dos llamadas con el mismo attemptId");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ KILL-SWITCH DIARIO (P3) ══════════════════════════

test("Kill-switch P3: la 3ª Actividad del mismo día para el mismo (usuario, Partner) se rechaza sin fila parcial", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  try {
    const first = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    const second = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    assert.equal(first.outcome, "registered");
    assert.equal(second.outcome, "registered");

    const third = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 1);
    assert.equal(third.outcome, "daily_limit_exceeded", "PB4 debe propagar el rechazo de P3 sin transformarlo en otro tipo de error");

    const service = createServiceRoleClient();
    const { data } = await service
      .from("partner_activities")
      .select("id")
      .eq("user_id", userId)
      .eq("partner_id", partner.id);
    assert.equal(data?.length, 2, "exactamente 2 Actividades, la tercera rechazada no debe dejar ninguna fila");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ POOL MENSUAL AGOTADO (P5) ══════════════════════════

test("Pool agotado (P5): la Actividad se registra igualmente con pointsAwarded=0, PB4 no lo trata como error", async () => {
  const { userId } = await signUpUser();
  const partner = await createTestPartner();
  const fillerPartner = await createTestPartner(); // Partner distinto para no chocar con P3 del par bajo prueba.
  try {
    const service = createServiceRoleClient();
    const alreadySpent = await getPartnersPoolSpentThisMonth();
    const remaining = MONTHLY_POOL_LIMIT_POINTS - alreadySpent;
    const fillerNeeded = remaining - 5; // deja menos margen (5) que el coste de la Actividad de prueba (10 Points).
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

    const balanceBefore = await getBalance(userId);
    const result = await registerQrActivity(userId, partner.accessToken, newAttemptId(), 10);

    assert.equal(result.outcome, "registered", "P5: sin margen, la Actividad se registra igualmente — NUNCA un error");
    if (result.outcome !== "registered") return;
    assert.equal(result.activity.pointsAwarded, 0, "sin margen, pointsAwarded debe ser exactamente 0");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore, "sin margen, el saldo no cambia — ningún rewards_transaction");
  } finally {
    await deleteTestUser(userId);
  }
});
