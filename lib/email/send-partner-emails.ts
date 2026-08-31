import { sendEmail, type SendEmailResult, type ResendLikeClient } from "./send-email";
import {
  renderPartnerApplicationReceivedEmail,
  renderPartnerApplicationNotificationEmail,
  renderPartnerApprovedEmail,
  renderPartnerRejectedEmail,
} from "./templates/partner-emails";

// Los 3 emails del ciclo de vida de una solicitud Partner. Cada función es
// best-effort (nunca lanza, ver send-email.ts) — el llamador nunca necesita
// un try/catch propio.

export async function sendPartnerApplicationReceivedEmail(params: {
  to: string;
  businessName: string;
}): Promise<SendEmailResult> {
  const { subject, html } = renderPartnerApplicationReceivedEmail({
    businessName: params.businessName,
  });
  return sendEmail({ to: params.to, subject, html });
}

// PARTNER APPLICATION NOTIFICATION V1 — cierra el único gap operativo
// real detectado en la auditoría de intake: nadie avisaba a Andrés de
// que existía una solicitud `pending` nueva. `PARTNER_NOTIFICATION_EMAIL`
// es el único destinatario válido — nunca se hardcodea ni se inventa uno.
// Sin esa variable configurada, se omite en silencio (no hay a quién
// escribir, ni siquiera se intenta llamar a Resend) — mismo criterio
// "best-effort, nunca rompe la solicitud ya creada" que las 3 funciones
// de arriba. Acepta `client` opcional (a diferencia de las otras 3) para
// poder verificar en tests, con inyección de dependencias, que el
// destinatario real es exactamente PARTNER_NOTIFICATION_EMAIL — sin esto
// no habría forma de comprobar "a quién" se envía sin una llamada real a
// Resend.
export async function sendPartnerApplicationNotificationEmail(
  params: {
    businessName: string;
    category: string;
    description?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    submittedAt: string;
  },
  client?: ResendLikeClient,
): Promise<SendEmailResult> {
  const notificationEmail = process.env.PARTNER_NOTIFICATION_EMAIL?.trim();
  if (!notificationEmail) {
    return { sent: false };
  }

  const { subject, html } = renderPartnerApplicationNotificationEmail(params);
  return sendEmail({ to: notificationEmail, subject, html }, client);
}

export async function sendPartnerApprovedEmail(params: {
  to: string;
  businessName: string;
  dashboardUrl: string;
}): Promise<SendEmailResult> {
  const { subject, html } = renderPartnerApprovedEmail({
    businessName: params.businessName,
    dashboardUrl: params.dashboardUrl,
  });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendPartnerRejectedEmail(params: {
  to: string;
  businessName: string;
}): Promise<SendEmailResult> {
  const { subject, html } = renderPartnerRejectedEmail({
    businessName: params.businessName,
  });
  return sendEmail({ to: params.to, subject, html });
}
