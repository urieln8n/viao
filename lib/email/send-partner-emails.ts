import { sendEmail, type SendEmailResult } from "./send-email";
import {
  renderPartnerApplicationReceivedEmail,
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
