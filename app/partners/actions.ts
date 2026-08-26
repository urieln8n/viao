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

export type RegisterPartnerActivityActionResult = PartnerActivityOutcome | { outcome: "unauthenticated" };

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

    return await registerQrActivity(userId, accessToken, attemptId, declaredAmountEur);
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

    return await registerReservationActivity(userId, accessToken, attemptId, declaredAmountEur, reservationReference);
  } catch (error) {
    if (!userId) {
      return { outcome: "unauthenticated" };
    }
    throw error;
  }
}
