import type { SupabaseClient } from "@supabase/supabase-js";

// PARTNER APPROVAL V1 — capa fina sobre el RPC set_partner_status()
// (SECURITY DEFINER, 20260901100000_add_partner_status_approval.sql),
// que concentra TODA la autorización (resolver auth.uid() internamente,
// comprobar auth.users.raw_app_meta_data.role) y la protección del
// trigger (protect_partners_immutable_fields(): señal transaccional +
// matriz de transiciones). Esta función no reimplementa nada de eso —
// mismo patrón exacto que linkPartnerOwner() (link-partner-owner.ts):
// recibe el cliente de SESIÓN real (nunca service_role — el RPC necesita
// que auth.uid() resuelva a quien está aprobando/rechazando/reactivando/
// desactivando), invoca el RPC, traduce la respuesta {updated: boolean}
// a un resultado tipado.
export type PartnerStatus = "active" | "inactive";

export type SetPartnerStatusOutcome = { outcome: "updated" } | { outcome: "not_updated" };

export async function setPartnerStatus(
  sessionClient: SupabaseClient,
  partnerId: string,
  newStatus: PartnerStatus,
): Promise<SetPartnerStatusOutcome> {
  const { data, error } = await sessionClient.rpc("set_partner_status", {
    p_partner_id: partnerId,
    p_new_status: newStatus,
  });

  if (error || !data || (data as { updated?: boolean }).updated !== true) {
    return { outcome: "not_updated" };
  }

  return { outcome: "updated" };
}
