"use server";

// UX-10 (Partners Visible + Discovery + Registration) — Server Action de
// `/partners/join`. Mismo patrón que app/partners/actions.ts (PB4): la
// UI nunca habla con Supabase directamente, solo con esta función, que a
// su vez delega en lib/partners/request-partner-registration.ts (única
// pieza que conoce `service_role` para este flujo). Deliberadamente NO
// resuelve ninguna sesión (`auth.getUser()`): un comercio que quiere
// unirse a VIAO no necesita tener ya una cuenta de VIAO.
import {
  requestPartnerRegistration,
  type PartnerRegistrationInput,
  type PartnerRegistrationOutcome,
} from "../../lib/partners/request-partner-registration";

export async function submitPartnerRegistrationAction(
  input: PartnerRegistrationInput,
): Promise<PartnerRegistrationOutcome> {
  return requestPartnerRegistration(input);
}
