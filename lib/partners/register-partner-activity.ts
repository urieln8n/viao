import { createServiceRoleClient } from "../supabase/service";
import { resolvePartnerAccess } from "./resolve-partner-access";

// Bloque Partners PB4 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — capa de
// aplicación que conecta Partner Access (PB3) con el RPC económico (PB2),
// sin duplicar ninguna lógica económica: `complete_partner_activity()`
// sigue siendo la ÚNICA autoridad para P1-P6 (tasas, kill-switches, pool,
// semántica de `points_awarded`). Esta capa únicamente resuelve el
// contexto (el `userId` SIEMPRE llega ya resuelto por el llamante —
// mismo patrón que `redeemReward()`/`completeMission()`: `auth.getUser()`
// vive en la Server Action, nunca aquí) y construye determinísticamente
// la pareja `attribution_mechanism`/`amount_confidence` según el flujo
// invocado — ninguna de las dos funciones exportadas expone esa pareja
// como parámetro, así que es estructuralmente imposible que un llamante
// (o un cliente que intente manipular la petición) fuerce la tasa de
// Reserva (P1, 2 Points/€) a través del flujo QR (P2, 1 Point/€), o
// viceversa.
//
// El `access_token` es la credencial que determina el Partner —
// `resolvePartnerAccess()` (PB3) es la única vía para obtener un
// `partner_id`; nunca se acepta uno enviado directamente por el cliente.

export interface PartnerActivityRegistered {
  activityId: string;
  pointsAwarded: number;
}

export type PartnerActivityOutcome =
  | { outcome: "registered"; activity: PartnerActivityRegistered }
  | { outcome: "partner_access_denied" }
  | { outcome: "invalid_amount" }
  | { outcome: "daily_limit_exceeded" }
  | { outcome: "error"; message: string };

async function callCompletePartnerActivity(params: {
  userId: string;
  accessToken: string;
  attemptId: string;
  declaredAmountEur: number;
  amountConfidence: "declared" | "confirmed_by_reservation";
  reservationReference?: string;
}): Promise<PartnerActivityOutcome> {
  if (!(params.declaredAmountEur > 0)) {
    return { outcome: "invalid_amount" };
  }

  // Un Partner A jamás puede registrar una Actividad para el Partner B:
  // su propio access_token nunca resuelve el id de B (garantizado
  // estructuralmente por resolve-partner-access.ts, verificado en PB3).
  const access = await resolvePartnerAccess(params.accessToken);
  if (access.status !== "granted") {
    return { outcome: "partner_access_denied" };
  }

  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("complete_partner_activity", {
    p_user_id: params.userId,
    p_partner_id: access.partner.id,
    p_attempt_id: params.attemptId,
    p_declared_amount_eur: params.declaredAmountEur,
    p_amount_confidence: params.amountConfidence,
    p_reservation_reference: params.reservationReference ?? null,
  });

  if (error) {
    // Mismo criterio de traducción por texto ya usado en
    // lib/rewards/redeem-reward.ts / lib/missions/complete-mission.ts:
    // PostgREST no distingue "excepción de negocio esperada" de "fallo
    // técnico" con un código propio.
    if (error.message.includes("partner_not_found_or_inactive")) {
      return { outcome: "partner_access_denied" };
    }
    if (error.message.includes("invalid_declared_amount") || error.message.includes("invalid_amount_confidence")) {
      return { outcome: "invalid_amount" };
    }
    if (error.message.includes("partner_daily_limit_exceeded")) {
      return { outcome: "daily_limit_exceeded" };
    }
    if (error.message.includes("user_not_found")) {
      return { outcome: "error", message: "user_not_found" };
    }
    return { outcome: "error", message: error.message };
  }
  if (!data) {
    return { outcome: "error", message: "complete_partner_activity no devolvió ninguna fila." };
  }

  // P5 (LOCKED, Decision Lock Económico Final): points_awarded=0 por
  // pool mensual agotado NUNCA es un error económico — la Actividad se
  // registró correctamente, el pool simplemente no tenía margen en ese
  // momento. Se devuelve como "registered" igual que cualquier otro caso
  // exitoso, exactamente igual que el RPC de PB2 ya lo trata; distinguir
  // visualmente ese caso (0 Points) es responsabilidad de la futura UI
  // (PB5), no de esta capa.
  return {
    outcome: "registered",
    activity: { activityId: data.id as string, pointsAwarded: data.points_awarded as number },
  };
}

/**
 * Flujo QR (Restaurantes, Master V2 §8): `attribution_mechanism='qr'`,
 * `amount_confidence='declared'` (P2, 1 Point/€) — determinístico, nunca
 * elegible por el llamante.
 */
export async function registerQrActivity(
  userId: string,
  accessToken: string,
  attemptId: string,
  declaredAmountEur: number,
): Promise<PartnerActivityOutcome> {
  return callCompletePartnerActivity({
    userId,
    accessToken,
    attemptId,
    declaredAmountEur,
    amountConfidence: "declared",
  });
}

/**
 * Flujo Reserva (Experiencias, Master V2 §8): `attribution_mechanism=
 * 'reservation'`, `amount_confidence='confirmed_by_reservation'` (P1, 2
 * Points/€) — determinístico, nunca elegible por el llamante. No es un
 * sistema de reservas real: `reservationReference` es texto libre,
 * puramente informativo (Technical Spec §9), nunca una FK — no se
 * conecta ningún proveedor de Travel/Hotelbeds/MockHotelProvider.
 */
export async function registerReservationActivity(
  userId: string,
  accessToken: string,
  attemptId: string,
  declaredAmountEur: number,
  reservationReference?: string,
): Promise<PartnerActivityOutcome> {
  return callCompletePartnerActivity({
    userId,
    accessToken,
    attemptId,
    declaredAmountEur,
    amountConfidence: "confirmed_by_reservation",
    reservationReference,
  });
}
