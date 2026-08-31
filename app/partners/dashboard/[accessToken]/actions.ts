"use server";

// UX-12 (Partner Self-Service C1) — mismo patrón que
// app/partners/join-actions.ts: la UI nunca habla con Supabase
// directamente, solo con esta función, que delega en
// lib/partners/update-partner-profile.ts (única pieza que conoce
// `service_role` para este flujo). Sin resolver ninguna sesión de
// usuario: la autorización de quién puede editar es exclusivamente el
// `access_token`, ya validado dentro de `updatePartnerProfile()`.
import {
  updatePartnerProfile,
  type PartnerProfileUpdateInput,
  type PartnerProfileUpdateOutcome,
} from "../../../../lib/partners/update-partner-profile";
import { createClient as createSessionClient } from "../../../../lib/supabase/server";
import { linkPartnerOwner, type LinkPartnerOwnerOutcome } from "../../../../lib/partners/link-partner-owner";

export async function updatePartnerProfileAction(
  accessToken: string,
  input: PartnerProfileUpdateInput,
): Promise<PartnerProfileUpdateOutcome> {
  return updatePartnerProfile(accessToken, input);
}

// UX-16.3 (Commerce Identity) — único punto donde se resuelve el cliente
// de SESIÓN real (nunca service_role: el RPC `link_partner_owner()`
// necesita que `auth.uid()` sea la sesión de quien está vinculando).
// Mismo patrón fail-closed que app/partners/actions.ts: fuera de una
// petición real de Next.js, `cookies()` lanza en vez de devolver una
// sesión vacía — se trata como "not_linked", nunca se propaga la
// excepción como si fuera un error del RPC.
export async function linkPartnerOwnerAction(accessToken: string): Promise<LinkPartnerOwnerOutcome> {
  try {
    const sessionClient = await createSessionClient();
    return await linkPartnerOwner(sessionClient, accessToken);
  } catch {
    return { outcome: "not_linked" };
  }
}
