"use server";

// Bloque Partners PB4 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Server
// Actions de Actividad de Partner. Único punto donde se resuelve la
// sesión REAL (`auth.getUser()`, nunca un `userId` enviado por el
// cliente) antes de invocar `lib/partners/register-partner-activity.ts`
// — mismo patrón exacto que `app/rewards/actions.ts`. No implementa
// ninguna UI: son las dos funciones que una futura UI (PB5) invocará.
import { createClient as createSessionClient } from "../../lib/supabase/server";
import {
  registerQrActivity,
  registerReservationActivity,
  type PartnerActivityOutcome,
} from "../../lib/partners/register-partner-activity";
import { completeMission } from "../../lib/missions/complete-mission";
import { checkAndCompleteReferralIfThresholdMet } from "../../lib/referrals/complete-referral-action";

export type RegisterPartnerActivityActionResult = PartnerActivityOutcome | { outcome: "unauthenticated" };

// FASE J-B4 (Core Reset — Dependency Exit, Product Decision Lock
// 2026-08-27) — efectos secundarios best-effort tras una Partner Activity
// registrada con éxito, en el mismo punto (Server Action) donde
// `app/booking/actions.ts` enganchaba su propio guard de Referrals —
// mismo patrón, nuevo origen. Ninguno de los dos debe impedir que la
// Actividad ya registrada se devuelva como éxito:
// 1. Mission "partner_activity_registered" (reemplaza `hotel_viewed`,
//    lib/missions/rules.ts) — mismo criterio best-effort ya usado para
//    "goal_created" en lib/goals/create-goal.ts.
// 2. Referrals — el nuevo modelo de umbral (2 Partner activities
//    confirmadas, lib/referrals/rules.ts `PARTNER_ACTIVITY_REFERRAL_TRIGGER`)
//    sustituye a `VALID_REFERRAL_ACTION_TRIGGER === "booking_confirmed"`
//    como mecanismo REALMENTE activo — sin tocar `lib/referrals/rules.ts`
//    ni `app/booking/actions.ts` en su constante histórica.
async function afterPartnerActivityRegistered(userId: string): Promise<void> {
  try {
    await completeMission(userId, "partner_activity_registered");
  } catch (error) {
    console.error(
      '[missions] No se pudo completar la Mission "partner_activity_registered":',
      error,
    );
  }

  try {
    await checkAndCompleteReferralIfThresholdMet(userId);
  } catch (error) {
    console.error(
      `[referrals] No se pudo comprobar el umbral de Partner activities para el usuario "${userId}":`,
      error,
    );
  }
}

export async function registerQrActivityAction(
  accessToken: string,
  attemptId: string,
  declaredAmountEur: number,
): Promise<RegisterPartnerActivityActionResult> {
  // Mismo patrón fail-closed que app/trips/actions.ts: fuera de una
  // petición real de Next.js, `cookies()` (dentro de createSessionClient())
  // lanza en vez de devolver una sesión vacía — se trata como
  // "unauthenticated" en vez de propagar la excepción, siempre que no se
  // haya resuelto ya un usuario real antes de que algo fallara.
  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
    if (!userId) {
      return { outcome: "unauthenticated" };
    }

    const result = await registerQrActivity(userId, accessToken, attemptId, declaredAmountEur);
    if (result.outcome === "registered") {
      await afterPartnerActivityRegistered(userId);
    }
    return result;
  } catch (error) {
    if (!userId) {
      return { outcome: "unauthenticated" };
    }
    throw error;
  }
}

export async function registerReservationActivityAction(
  accessToken: string,
  attemptId: string,
  declaredAmountEur: number,
  reservationReference?: string,
): Promise<RegisterPartnerActivityActionResult> {
  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
    if (!userId) {
      return { outcome: "unauthenticated" };
    }

    const result = await registerReservationActivity(userId, accessToken, attemptId, declaredAmountEur, reservationReference);
    if (result.outcome === "registered") {
      await afterPartnerActivityRegistered(userId);
    }
    return result;
  } catch (error) {
    if (!userId) {
      return { outcome: "unauthenticated" };
    }
    throw error;
  }
}
