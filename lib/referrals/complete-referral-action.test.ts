// F8-04/F8-05 (VIAO_ROADMAP.md) — Tests de la recompensa de referidos
// contra Supabase local real (no un mock). `completeReferralActionIfPending`
// usa `createServiceRoleClient()` (sin `next/headers`), así que es
// totalmente ejercitable aquí — mismo patrón que
// lib/rewards/create-reward-transaction.test.ts (F7-01).
//
// La fila `referrals` en sí NO se crea desde código de aplicación (ver
// lib/referrals/rules.ts y la auditoría del reporte de la fase): se crea
// mediante el trigger `handle_new_user()` durante un `signUp()` real con
// `options.data.referral_code` — por eso los helpers de este archivo
// registran usuarios reales, igual que
// lib/rewards/registration-reward.test.ts (F7-04) probó el trigger de
// recompensa de registro.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { completeReferralActionIfPending } from "./complete-referral-action";
import {
  REFERRED_REWARD_POINTS_PROVISIONAL,
  REFERRER_REWARD_POINTS_PROVISIONAL,
} from "./rules";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(referralCode?: string) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f804-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f804-test-password-12345",
    ...(referralCode ? { options: { data: { referral_code: referralCode } } } : {}),
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

/** Registra un referidor real y un referido real usando su código, y devuelve la referral pending resultante. */
async function createReferralPair() {
  const referrer = await signUpUser();
  const { data: referrerProfile } = await referrer.authedClient
    .from("profiles")
    .select("referral_code")
    .eq("id", referrer.userId)
    .single();
  assert.ok(referrerProfile);

  const referred = await signUpUser(referrerProfile.referral_code);

  const service = createServiceRoleClient();
  const { data: referral } = await service
    .from("referrals")
    .select("id, status")
    .eq("referred_id", referred.userId)
    .single();
  assert.ok(referral);
  assert.equal(referral.status, "pending", "la referral debe crearse pending antes de cada test");

  return { referrerId: referrer.userId, referredId: referred.userId, referralId: referral.id as string };
}

// ── Sin referral pendiente: no-op silencioso, no lanza, no crea nada ──
test("completeReferralActionIfPending: usuario sin ninguna referral -> no-op, no lanza", async () => {
  const { userId } = await signUpUser();
  try {
    await assert.doesNotReject(() => completeReferralActionIfPending(userId));

    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", "referral");
    assert.equal(count, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── F8-04: acción válida -> reward para referrer y referred, status pending -> rewarded ──
test("completeReferralActionIfPending: con una referral pending, crea 1 reward para el referrer y 1 para el referred, y transiciona a rewarded", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await completeReferralActionIfPending(referredId);

    const service = createServiceRoleClient();
    const { data: referral, error: referralError } = await service
      .from("referrals")
      .select("status, valid_action_completed_at")
      .eq("id", referralId)
      .single();
    assert.equal(referralError, null);
    assert.equal(referral.status, "rewarded");
    assert.ok(referral.valid_action_completed_at, "valid_action_completed_at debe quedar registrado");

    const { data: referrerReward, error: referrerError } = await service
      .from("rewards_transactions")
      .select("amount, type, reason, reference_type, reference_id, user_id")
      .eq("reference_type", "referral")
      .eq("reference_id", referralId)
      .eq("user_id", referrerId)
      .single();
    assert.equal(referrerError, null);
    assert.equal(referrerReward.amount, REFERRER_REWARD_POINTS_PROVISIONAL);
    assert.equal(referrerReward.type, "earned");
    assert.equal(referrerReward.reason, "referral");

    const { data: referredReward, error: referredError } = await service
      .from("rewards_transactions")
      .select("amount, type, reason, reference_type, reference_id, user_id")
      .eq("reference_type", "referral")
      .eq("reference_id", referralId)
      .eq("user_id", referredId)
      .single();
    assert.equal(referredError, null);
    assert.equal(referredReward.amount, REFERRED_REWARD_POINTS_PROVISIONAL);
    assert.equal(referredReward.type, "earned");
    assert.equal(referredReward.reason, "referral");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── Repetición: 0 rewards adicionales ──
test("completeReferralActionIfPending: repetir la acción sobre una referral ya rewarded no crea rewards adicionales", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await completeReferralActionIfPending(referredId);
    await completeReferralActionIfPending(referredId);
    await completeReferralActionIfPending(referredId);

    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reference_type", "referral")
      .eq("reference_id", referralId);
    assert.equal(count, 2, "debe seguir habiendo exactamente 2 filas (1 referrer + 1 referred), nunca más");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── Concurrencia real: Promise.all sobre la misma acción válida ──
test("completeReferralActionIfPending: llamadas concurrentes reales (Promise.all) no duplican las recompensas", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await Promise.all([
      completeReferralActionIfPending(referredId),
      completeReferralActionIfPending(referredId),
      completeReferralActionIfPending(referredId),
    ]);

    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reference_type", "referral")
      .eq("reference_id", referralId);
    assert.equal(count, 2, "una carrera concurrente real nunca debe producir más de 1 reward por parte");

    const { data: referral } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.ok(referral);
    assert.equal(referral.status, "rewarded");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── Seguridad: cliente no puede marcar rewarded ni escribir referrals directamente ──
test("un usuario autenticado no puede hacer UPDATE en referrals directamente (ni siquiera sobre su propia referral)", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const anyAuthedClient = createClient(supabaseUrl, anonKey);

    const { error } = await anyAuthedClient
      .from("referrals")
      .update({ status: "rewarded" })
      .eq("id", referralId);
    assert.ok(
      error,
      "se esperaba que se rechazara el UPDATE: referrals solo tiene policy de SELECT para authenticated",
    );

    const service = createServiceRoleClient();
    const { data } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.ok(data);
    assert.equal(data.status, "pending", "el intento del cliente no debe haber alterado el estado real");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

test("un cliente no puede insertar referrals directamente (ni con service_role: sin GRANT de INSERT)", async () => {
  const service = createServiceRoleClient();
  const { error } = await service.from("referrals").insert({
    referrer_id: "00000000-0000-0000-0000-000000000000",
    referred_id: "11111111-1111-1111-1111-111111111111",
    referral_code_used: "FAKE",
    status: "pending",
  });
  assert.ok(
    error,
    "se esperaba que Postgres rechazara el INSERT: la migración F8-04 concede únicamente SELECT+UPDATE, nunca INSERT — la fila la crea solo el trigger",
  );
});

test("service_role NO tiene GRANT de DELETE sobre referrals", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    const service = createServiceRoleClient();
    const { error } = await service.from("referrals").delete().eq("id", referralId);
    assert.ok(error, "se esperaba que Postgres rechazara el DELETE");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});
