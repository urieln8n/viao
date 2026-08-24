import { createServiceRoleClient } from "../supabase/service";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — transición pending -> fulfilled.
// A diferencia del canje y la cancelación, esta transición no necesita
// atomicidad compleja (no toca el ledger, solo el estado de la propia
// redención) — un UPDATE directo vía `service_role` basta, sin
// necesitar una función SQL dedicada.
//
// Quién invoca esto: en el Bloque 1 no existe todavía ningún flujo real
// de Partner que confirme la entrega (eso es el bloque de Partners+QR,
// fuera de alcance aquí) — esta función queda lista y probada para ese
// flujo futuro, sin ninguna UI que la dispare todavía en este bloque.
//
// `reward_redeemed` (lib/analytics/events.ts) se dispara desde quien
// llame a esta función, exactamente cuando `success:true` — nunca desde
// aquí directamente, mismo criterio que el resto de `lib/analytics/`
// (un único punto, `logAnalyticsEvent`, nunca disperso).
export interface MarkRedemptionFulfilledResult {
  success: boolean;
}

export async function markRedemptionFulfilled(
  userId: string,
  redemptionId: string,
): Promise<MarkRedemptionFulfilledResult> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("reward_redemptions")
    .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
    .eq("id", redemptionId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false };
  }

  return { success: true };
}
