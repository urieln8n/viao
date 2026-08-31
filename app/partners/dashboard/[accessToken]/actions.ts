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

export async function updatePartnerProfileAction(
  accessToken: string,
  input: PartnerProfileUpdateInput,
): Promise<PartnerProfileUpdateOutcome> {
  return updatePartnerProfile(accessToken, input);
}
