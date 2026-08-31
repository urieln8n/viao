import { t } from "../../i18n";
import { escapeHtml, renderEmailLayout } from "./layout";

export interface RenderedEmail {
  subject: string;
  html: string;
}

// Partner no tiene columna `locale` (a diferencia de `profiles`) — estos
// tres emails se envían siempre en DEFAULT_LOCALE (es), ver el comentario
// en lib/i18n/es.ts junto a las claves "email.*".

export function renderPartnerApplicationReceivedEmail(params: {
  businessName: string;
}): RenderedEmail {
  const bodyHtml = `
    <p style="margin:0 0 12px;">${t("email.partnerApplicationReceived.greeting")} ${escapeHtml(params.businessName)}</p>
    <p style="margin:0 0 12px;">${t("email.partnerApplicationReceived.body1")}</p>
    <p style="margin:0;">${t("email.partnerApplicationReceived.body2")}</p>
  `;
  return {
    subject: t("email.partnerApplicationReceived.subject"),
    html: renderEmailLayout({
      previewText: t("email.partnerApplicationReceived.previewText"),
      title: t("email.partnerApplicationReceived.title"),
      bodyHtml,
    }),
  };
}

export function renderPartnerApprovedEmail(params: {
  businessName: string;
  dashboardUrl: string;
}): RenderedEmail {
  const bodyHtml = `
    <p style="margin:0 0 12px;">${t("email.partnerApproved.greeting")} ${escapeHtml(params.businessName)}</p>
    <p style="margin:0 0 12px;">${t("email.partnerApproved.body1")}</p>
    <p style="margin:0;">${t("email.partnerApproved.body2")}</p>
  `;
  return {
    subject: t("email.partnerApproved.subject"),
    html: renderEmailLayout({
      previewText: t("email.partnerApproved.previewText"),
      title: t("email.partnerApproved.title"),
      bodyHtml,
      ctaLabel: t("email.partnerApproved.cta"),
      ctaUrl: params.dashboardUrl,
    }),
  };
}

export function renderPartnerRejectedEmail(params: {
  businessName: string;
}): RenderedEmail {
  const bodyHtml = `
    <p style="margin:0 0 12px;">${t("email.partnerRejected.greeting")} ${escapeHtml(params.businessName)}</p>
    <p style="margin:0 0 12px;">${t("email.partnerRejected.body1")}</p>
    <p style="margin:0;">${t("email.partnerRejected.body2")}</p>
  `;
  return {
    subject: t("email.partnerRejected.subject"),
    html: renderEmailLayout({
      previewText: t("email.partnerRejected.previewText"),
      title: t("email.partnerRejected.title"),
      bodyHtml,
    }),
  };
}
