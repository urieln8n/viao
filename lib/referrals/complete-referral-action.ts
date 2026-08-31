import { createServiceRoleClient } from "../supabase/service";
import { createRewardTransaction } from "../rewards/create-reward-transaction";
import { logAnalyticsEvent } from "../analytics/log-event";
import {
  REFERRED_REWARD_POINTS_PROVISIONAL,
  REFERRER_REWARD_POINTS_PROVISIONAL,
  PARTNER_ACTIVITY_REFERRAL_TRIGGER,
} from "./rules";

// F8-04 (VIAO_ROADMAP.md) — Cuando el usuario referido completa la acción
// válida (hoy: `booking_confirmed`, ver `lib/referrals/rules.ts`), crea
// las recompensas para AMBAS partes y transiciona `referrals.status`
// `pending -> rewarded`.
//
// RLS/GRANT (Patrón B, auditado antes de escribir este archivo):
// `referrals` solo concede SELECT a `authenticated`
// (`referrals_select_participant`) — "Insertar/Modificar/Eliminar: nadie
// desde el cliente" (VIAO_DATABASE.md sección 9). `service_role` tampoco
// tenía ningún GRANT (mismo vacío recurrente de F5-05/F6-02/F6-03/F7-01);
// corregido en
// supabase/migrations/20260818130000_grant_service_role_referrals.sql —
// ÚNICAMENTE SELECT + UPDATE (nunca INSERT: la fila de `referrals` la crea
// el trigger `handle_new_user()`, SECURITY DEFINER, en el momento del
// registro — ver supabase/migrations/20260818140000_*.sql — este archivo
// nunca inserta una referral, solo la lee y actualiza su estado). Sin
// DELETE: nunca se borra una referral.
//
// Reutiliza `createRewardTransaction()` (F7-01) — el ÚNICO punto de
// escritura del ledger — para ambas recompensas. No se inserta
// directamente en `rewards_transactions` desde aquí, ni se crea ningún
// ledger paralelo.
//
// Idempotencia: dos capas independientes, verificadas empíricamente antes
// de asumir que funcionan (ver el reporte de la fase):
// 1. La consulta solo actúa si `status = 'pending'` — una referral ya
//    `rewarded` no vuelve a procesarse en absoluto.
// 2. Aunque dos llamadas concurrentes leyeran `pending` a la vez (carrera
//    real, sin bloqueo explícito), cada una llama a `createRewardTransaction()`
//    dos veces (referrer + referred) con el MISMO `reference_id = referral.id`
//    — la constraint real `rewards_transactions_user_reference_reason_unique`
//    (`UNIQUE (user_id, reason, reference_type, reference_id)`, migración
//    20260818150000_*.sql — corrige la constraint original de F7-01, que
//    no incluía `user_id` y por tanto bloqueaba incorrectamente que
//    referrer y referred tuvieran cada uno su propia recompensa sobre la
//    MISMA referral; verificado empíricamente antes de esta corrección,
//    ver el reporte de F8-04) garantiza que, PARA CADA usuario por
//    separado, como máximo una de las llamadas concurrentes cree su fila;
//    la otra recibe `created: false` con el mismo id, nunca un duplicado.
//    El UPDATE final añade `.eq("status", "pending")` como condición, así
//    que solo una de las dos llamadas concurrentes consigue transicionar
//    el estado (la otra actualiza 0 filas, sin error).
//
// Fallo parcial: si CUALQUIERA de las dos recompensas falla (nunca debería,
// salvo un fallo técnico real), la función relanza el error ANTES de
// llegar al UPDATE de `status` — la referral se queda en `pending`, nunca
// se oculta el fallo marcándola `rewarded` de todos modos. Si una de las
// dos recompensas ya se creó de verdad antes del fallo, un reintento
// posterior (`status` sigue `pending`) es seguro: `createRewardTransaction()`
// detecta la que ya existe (`created: false`) y solo crea la que faltaba
// — nunca duplica la que ya se había otorgado.
export async function completeReferralActionIfPending(
  referredUserId: string,
): Promise<void> {
  const service = createServiceRoleClient();

  const { data: referral, error } = await service
    .from("referrals")
    .select("id, referrer_id, referred_id")
    .eq("referred_id", referredUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !referral) {
    // Sin referral pendiente para este usuario (nunca fue referido, o su
    // referral ya está `rewarded`/`invalid`): no hay nada que hacer, no es
    // un error.
    return;
  }

  const referrerReward = await createRewardTransaction({
    userId: referral.referrer_id,
    amount: REFERRER_REWARD_POINTS_PROVISIONAL,
    reason: "referral",
    referenceType: "referral",
    referenceId: referral.id,
  });
  const referredReward = await createRewardTransaction({
    userId: referral.referred_id,
    amount: REFERRED_REWARD_POINTS_PROVISIONAL,
    reason: "referral",
    referenceType: "referral",
    referenceId: referral.id,
  });

  // F12-02 (VIAO_ROADMAP.md) — `reward_earned` para AMBAS partes, cada una
  // con su `userId` explícito (nunca el de la sesión actual: quien invoca
  // esta función está autenticado como el REFERIDO, no como el referrer —
  // ver el parámetro `explicitUserId` de `logAnalyticsEvent`, F12-02).
  // Solo si `created: true`, mismo criterio de idempotencia que la
  // recompensa de reserva (F12-02).
  if (referrerReward.created) {
    await logAnalyticsEvent(
      "reward_earned",
      { referralId: referral.id, reason: "referral", amount: REFERRER_REWARD_POINTS_PROVISIONAL, role: "referrer" },
      referral.referrer_id,
    );
  }
  if (referredReward.created) {
    await logAnalyticsEvent(
      "reward_earned",
      { referralId: referral.id, reason: "referral", amount: REFERRED_REWARD_POINTS_PROVISIONAL, role: "referred" },
      referral.referred_id,
    );
  }

  const { error: updateError } = await service
    .from("referrals")
    .update({
      status: "rewarded",
      valid_action_completed_at: new Date().toISOString(),
    })
    .eq("id", referral.id)
    .eq("status", "pending");

  if (updateError) {
    throw new Error(
      `No se pudo marcar la referral "${referral.id}" como rewarded: ${updateError.message}`,
    );
  }
}

// FASE J-B4 (Core Reset — Dependency Exit) — puerta de entrada del nuevo
// modelo de umbral (`PARTNER_ACTIVITY_REFERRAL_TRIGGER`): cuenta las
// Partner activities confirmadas del usuario referido y, solo si ya
// alcanzó el mínimo exigido, delega en `completeReferralActionIfPending`
// (sin cambios) — que ya es, por sí mismo, un no-op seguro si el usuario
// nunca fue referido o su referral ya se resolvió. No añade ninguna
// escritura nueva ni ningún ledger paralelo: cuenta filas de
// `partner_activities` (cada una ya nacida confirmada por el propio
// Partner, PMM3) con el cliente `service_role`, mismo criterio de
// autoridad ya usado en el resto de este archivo. Llamado desde
// `app/partners/actions.ts`, mismo punto (Server Action, tras una
// Partner Activity registrada con éxito) donde antes se enganchaba
// `app/booking/actions.ts` con el modelo de evento único.
export async function checkAndCompleteReferralIfThresholdMet(userId: string): Promise<void> {
  const service = createServiceRoleClient();

  const { count, error } = await service
    .from("partner_activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error || count === null || count < PARTNER_ACTIVITY_REFERRAL_TRIGGER.minCount) {
    return;
  }

  await completeReferralActionIfPending(userId);
}
