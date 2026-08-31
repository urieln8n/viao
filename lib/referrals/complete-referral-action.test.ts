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
import { completeReferralActionIfPending, checkAndCompleteReferralIfThresholdMet } from "./complete-referral-action";
import {
  REFERRED_REWARD_POINTS_PROVISIONAL,
  REFERRER_REWARD_POINTS_PROVISIONAL,
  PARTNER_ACTIVITY_REFERRAL_TRIGGER,
} from "./rules";
import { registerQrActivity } from "../partners/register-partner-activity";

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

// ── F12-02: reward_earned para AMBAS partes, cada uno con su propio user_id ──
test("completeReferralActionIfPending (F12-02): registra reward_earned para el referrer Y para el referred, cada uno atribuido a su propio user_id", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await completeReferralActionIfPending(referredId);

    // Tanto referrer como referred son usuarios recién registrados (via
    // createReferralPair -> signUpUser): cada uno YA tiene su propio
    // reward_earned de registro (F12-02) antes de esta llamada — se filtra
    // por metadata.referralId, específico del reward_earned de referido.
    const service = createServiceRoleClient();
    const { data: referrerEvents } = await service
      .from("analytics_events")
      .select("user_id, metadata")
      .eq("event_name", "reward_earned")
      .eq("user_id", referrerId);
    const referrerReferralEvent = (referrerEvents ?? []).find(
      (row) => (row.metadata as Record<string, unknown>).referralId === referralId,
    );
    assert.ok(referrerReferralEvent, "debe existir un reward_earned de referral para el referrer");

    const { data: referredEvents } = await service
      .from("analytics_events")
      .select("user_id, metadata")
      .eq("event_name", "reward_earned")
      .eq("user_id", referredId);
    const referredReferralEvent = (referredEvents ?? []).find(
      (row) => (row.metadata as Record<string, unknown>).referralId === referralId,
    );
    assert.ok(referredReferralEvent, "debe existir un reward_earned de referral para el referido");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── F12-02: repetir la acción no duplica los eventos de analytics ──
test("completeReferralActionIfPending (F12-02): repetir la acción sobre una referral ya rewarded no duplica reward_earned", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await completeReferralActionIfPending(referredId);
    await completeReferralActionIfPending(referredId);
    await completeReferralActionIfPending(referredId);

    const service = createServiceRoleClient();
    const { count } = await service
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "reward_earned")
      .eq("metadata->>referralId", referralId)
      .in("user_id", [referrerId, referredId]);
    assert.equal(count, 2, "exactamente 1 reward_earned de referral por parte, nunca más aunque se repita la llamada");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── F12-02: referral_created se registra desde el trigger de registro, atribuido al referrer ──
test("F12-02: referral_created se registra al crear la referral (trigger de registro), atribuido al referrer", async () => {
  const referrer = await signUpUser();
  const { data: referrerProfile } = await referrer.authedClient
    .from("profiles")
    .select("referral_code")
    .eq("id", referrer.userId)
    .single();
  assert.ok(referrerProfile);

  const referred = await signUpUser(referrerProfile.referral_code);
  try {
    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("user_id, metadata")
      .eq("event_name", "referral_created")
      .eq("user_id", referrer.userId);
    assert.equal(data?.length, 1);
    assert.equal((data![0].metadata as Record<string, unknown>).referred_id, referred.userId);
  } finally {
    await deleteTestUser(referrer.userId);
    await deleteTestUser(referred.userId);
  }
});

test("F12-02: un código de referido inválido/inexistente NO genera referral_created", async () => {
  const { userId } = await signUpUser("CODIGO-QUE-NO-EXISTE-123");
  try {
    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("id")
      .eq("event_name", "referral_created")
      .eq("user_id", userId);
    assert.equal(data?.length ?? 0, 0);
  } finally {
    await deleteTestUser(userId);
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

// ═══════════════════════════════════════════════════════════════════
// FASE J-B4 (Core Reset — Dependency Exit) — checkAndCompleteReferralIfThresholdMet()
// Nuevo modelo de umbral: PARTNER_ACTIVITY_REFERRAL_TRIGGER.minCount
// Partner activities confirmadas del referido, en vez del evento único
// "booking_confirmed". Mismo patrón de usuarios/referrals reales ya
// usado en el resto de este archivo, más un Partner de test real (mismo
// helper que lib/partners/register-partner-activity.test.ts).
// ═══════════════════════════════════════════════════════════════════

async function createTestPartner(): Promise<{ accessToken: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Test Partner J-B4 ${suffix}`, slug: `test-partner-jb4-${suffix}`, category: "restaurant", status: "active", is_test: true })
    .select("access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { accessToken: data!.access_token as string };
}

function newAttemptId(): string {
  return crypto.randomUUID();
}

async function registerNPartnerActivities(userId: string, accessToken: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const result = await registerQrActivity(userId, accessToken, newAttemptId(), 10);
    assert.equal(result.outcome, "registered", `registrar la actividad #${i + 1} de ${n} falló`);
  }
}

async function countReferralRewardTransactions(referralId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { count } = await service
    .from("rewards_transactions")
    .select("id", { count: "exact", head: true })
    .eq("reference_type", "referral")
    .eq("reference_id", referralId);
  return count ?? 0;
}

// ── CASE 1: 0 activities -> no reward ──
test("checkAndCompleteReferralIfThresholdMet: referido con 0 Partner activities -> ninguna recompensa, referral sigue pending", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  try {
    await checkAndCompleteReferralIfThresholdMet(referredId);

    assert.equal(await countReferralRewardTransactions(referralId), 0);
    const service = createServiceRoleClient();
    const { data: referral } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.equal(referral?.status, "pending");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── CASE 2: 1 activity (por debajo del umbral, minCount=2) -> no reward ──
test("checkAndCompleteReferralIfThresholdMet: referido con 1 Partner activity (por debajo del umbral) -> ninguna recompensa todavía", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  const { accessToken } = await createTestPartner();
  try {
    await registerNPartnerActivities(referredId, accessToken, 1);
    await checkAndCompleteReferralIfThresholdMet(referredId);

    assert.equal(await countReferralRewardTransactions(referralId), 0);
    const service = createServiceRoleClient();
    const { data: referral } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.equal(referral?.status, "pending");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── CASE 3: 2 activities (== minCount) -> reward para ambas partes ──
test("checkAndCompleteReferralIfThresholdMet: referido alcanza el umbral (2 activities) -> recompensa para referrer y referido, referral rewarded", async () => {
  assert.equal(PARTNER_ACTIVITY_REFERRAL_TRIGGER.minCount, 2, "este test asume el umbral aprobado (Product Decision Lock, 2026-08-27)");
  const { referrerId, referredId, referralId } = await createReferralPair();
  const { accessToken } = await createTestPartner();
  try {
    await registerNPartnerActivities(referredId, accessToken, 2);
    await checkAndCompleteReferralIfThresholdMet(referredId);

    assert.equal(await countReferralRewardTransactions(referralId), 2, "1 reward para el referrer + 1 para el referido");

    const service = createServiceRoleClient();
    const { data: referral } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.equal(referral?.status, "rewarded");

    const { data: referrerReward } = await service
      .from("rewards_transactions")
      .select("amount")
      .eq("reference_type", "referral")
      .eq("reference_id", referralId)
      .eq("user_id", referrerId)
      .single();
    assert.equal(referrerReward?.amount, REFERRER_REWARD_POINTS_PROVISIONAL);

    const { data: referredReward } = await service
      .from("rewards_transactions")
      .select("amount")
      .eq("reference_type", "referral")
      .eq("reference_id", referralId)
      .eq("user_id", referredId)
      .single();
    assert.equal(referredReward?.amount, REFERRED_REWARD_POINTS_PROVISIONAL);
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── CASE 4: 3+ activities -> NO segunda recompensa ──
test("checkAndCompleteReferralIfThresholdMet: una 3ª Partner activity tras ya recompensado -> ninguna recompensa adicional", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  const { accessToken } = await createTestPartner();
  try {
    await registerNPartnerActivities(referredId, accessToken, 2);
    await checkAndCompleteReferralIfThresholdMet(referredId);
    assert.equal(await countReferralRewardTransactions(referralId), 2, "recompensado tras la 2ª actividad");

    // 3ª actividad real, con un SEGUNDO Partner de test: el mismo Partner ya
    // recibió 2 actividades de este usuario hoy, así que reutilizarlo
    // chocaría con el kill-switch real v_daily_activity_limit=2 por
    // (user, partner, día) de complete_partner_activity() — un límite que
    // este test no pretende ejercitar (eso ya lo cubre
    // lib/partners/register-partner-activity.test.ts). Un Partner distinto
    // simula fielmente "el usuario referido tiene una 3ª actividad real en
    // VIAO" sin tocar ese kill-switch. El mismo hook que dispara
    // app/partners/actions.ts vuelve a llamar a
    // checkAndCompleteReferralIfThresholdMet — debe seguir siendo un no-op
    // seguro (completeReferralActionIfPending ya no encuentra ninguna
    // referral 'pending' para este usuario).
    const { accessToken: secondAccessToken } = await createTestPartner();
    await registerNPartnerActivities(referredId, secondAccessToken, 1);
    await checkAndCompleteReferralIfThresholdMet(referredId);

    assert.equal(await countReferralRewardTransactions(referralId), 2, "sigue siendo exactamente 2, nunca 4");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});

// ── CASE 5: self-referral sigue bloqueado (constraint real, no tocada) — confirmado también a través del nuevo camino ──
test("checkAndCompleteReferralIfThresholdMet: un usuario sin ninguna referral real (p. ej. tras un intento de autorreferencia rechazado) nunca genera una recompensa de referido", async () => {
  // El bloqueo real de autorreferencia (referrer_id = referred_id) vive en
  // una constraint de DB, ya probada y NO modificada en esta fase
  // (lib/referrals/referral-registration.test.ts, F8-05 Caso 6). Este
  // test confirma que, para un usuario que nunca llegó a tener una
  // referral real (mismo estado final que produce ese bloqueo), el nuevo
  // camino de umbral tampoco inventa ninguna recompensa aunque el usuario
  // sí tenga Partner activities reales.
  const { userId } = await signUpUser();
  const { accessToken } = await createTestPartner();
  try {
    await registerNPartnerActivities(userId, accessToken, 2);
    await assert.doesNotReject(() => checkAndCompleteReferralIfThresholdMet(userId));

    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", "referral");
    assert.equal(count, 0, "sin ninguna referral real, nunca debe crearse una recompensa 'referral'");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── CASE 6: repetir el proceso -> no farming adicional (idempotencia + concurrencia real vía el nuevo camino) ──
test("checkAndCompleteReferralIfThresholdMet: llamadas repetidas y concurrentes tras alcanzar el umbral nunca duplican la recompensa", async () => {
  const { referrerId, referredId, referralId } = await createReferralPair();
  const { accessToken } = await createTestPartner();
  try {
    await registerNPartnerActivities(referredId, accessToken, 2);

    await Promise.all([
      checkAndCompleteReferralIfThresholdMet(referredId),
      checkAndCompleteReferralIfThresholdMet(referredId),
      checkAndCompleteReferralIfThresholdMet(referredId),
    ]);

    assert.equal(await countReferralRewardTransactions(referralId), 2, "una carrera real nunca debe producir más de 1 reward por parte");

    const service = createServiceRoleClient();
    const { data: referral } = await service.from("referrals").select("status").eq("id", referralId).single();
    assert.equal(referral?.status, "rewarded");
  } finally {
    await deleteTestUser(referrerId);
    await deleteTestUser(referredId);
  }
});
