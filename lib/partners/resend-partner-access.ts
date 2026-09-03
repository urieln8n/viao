import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { sendPartnerApprovedEmail } from "../email/send-partner-emails";
import type { ResendLikeClient } from "../email/send-email";
import { isPartnerAdmin } from "./get-partners-for-admin";

// P14.1.1 (Partner Onboarding + Access Recovery) — fallback manual seguro
// al webhook de aprobación (app/api/webhooks/partner-status/route.ts,
// mecanismo automático principal, sin tocar). Mismo patrón exacto que
// setPartnerStatus() (lib/partners/set-partner-status.ts): recibe el
// cliente de SESIÓN real (nunca service_role para la comprobación de
// identidad — auth.uid() debe resolver a quien está reenviando), y
// devuelve una única respuesta genérica {"sent"|"not_sent"} para TODOS
// los casos de fallo — sin sesión, sin partner_admin, Partner inexistente,
// no active, sin contact_email, o fallo real de Resend. A diferencia de
// set_partner_status()/link_partner_owner(), esta comprobación de
// autorización no necesita un RPC SECURITY DEFINER: no escribe ninguna
// columna protegida de `partners` (no escribe nada en absoluto), solo LEE
// vía service_role (mismo patrón que resolveOwnedPartners()) y reenvía un
// email ya existente — isPartnerAdmin() sobre el `user` de una sesión
// verificada con getUser() (JWT validado, no getSession()) es autoridad
// suficiente y testable exactamente igual que el resto del dominio
// Partners.
//
// El `access_token` de la fila NUNCA sale de esta función: se lee aquí,
// se usa para construir `dashboardUrl`, y ninguno de los dos valores
// (token ni URL) forma parte del tipo de retorno.
export type ResendPartnerAccessOutcome = { outcome: "sent" } | { outcome: "not_sent" };

function getSiteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}

export async function resendPartnerAccess(
  sessionClient: SupabaseClient,
  partnerId: string,
  // Solo para tests (mismo motivo que sendPartnerApplicationNotificationEmail):
  // ningún llamante real (Server Action) lo pasa.
  emailClient?: ResendLikeClient,
): Promise<ResendPartnerAccessOutcome> {
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !isPartnerAdmin(user)) {
    return { outcome: "not_sent" };
  }

  if (!partnerId) {
    return { outcome: "not_sent" };
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("name, status, contact_email, access_token")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !data) {
    return { outcome: "not_sent" };
  }

  // Mismo criterio que resolvePartnerAccess(): solo un Partner `active`
  // tiene un Dashboard alcanzable — reenviar el enlace de uno `pending`
  // o `inactive` produciría un email con un enlace que hoy resuelve en
  // notFound(), más confuso que útil.
  if (data.status !== "active") {
    return { outcome: "not_sent" };
  }

  const contactEmail = (data.contact_email as string | null)?.trim();
  if (!contactEmail) {
    return { outcome: "not_sent" };
  }

  const result = await sendPartnerApprovedEmail(
    {
      to: contactEmail,
      businessName: data.name as string,
      dashboardUrl: `${getSiteUrl()}/partners/dashboard/${data.access_token as string}`,
    },
    emailClient,
  );

  return result.sent ? { outcome: "sent" } : { outcome: "not_sent" };
}
