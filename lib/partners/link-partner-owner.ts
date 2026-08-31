import type { SupabaseClient } from "@supabase/supabase-js";

// UX-16.3 (Commerce Identity) — capa fina sobre el RPC `link_partner_owner()`
// (20260831140000_add_partners_owner_id_identity.sql), que es quien
// concentra TODA la lógica de seguridad (resolver auth.uid() internamente,
// comparar email verificado, UPDATE atómico condicional, respuesta sin
// enumeración). Esta función no reimplementa nada de eso — solo invoca el
// RPC con el `sessionClient` REAL del propio usuario (nunca service_role:
// el RPC necesita que `auth.uid()` resuelva a la sesión de quien está
// vinculando, no a un usuario resuelto de antemano) y traduce la
// respuesta `{linked: boolean}` a un resultado tipado.
export type LinkPartnerOwnerOutcome = { outcome: "linked" } | { outcome: "not_linked" };

export async function linkPartnerOwner(
  sessionClient: SupabaseClient,
  accessToken: string,
): Promise<LinkPartnerOwnerOutcome> {
  const { data, error } = await sessionClient.rpc("link_partner_owner", {
    p_access_token: accessToken,
  });

  if (error || !data || (data as { linked?: boolean }).linked !== true) {
    return { outcome: "not_linked" };
  }

  return { outcome: "linked" };
}
