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

function renderNotificationField(label: string, value: string): string {
  return `<p style="margin:0 0 8px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

// PARTNER APPLICATION NOTIFICATION V1 — único destinatario es Andrés
// (PARTNER_NOTIFICATION_EMAIL, ver send-partner-emails.ts), nunca el
// comercio solicitante. Deliberadamente NO recibe `access_token` como
// parámetro — ni siquiera puede filtrarse por error, porque el tipo de
// `params` no lo contempla. `category` llega tal cual la guardó
// requestPartnerRegistration() (valor real de PARTNER_CATEGORIES, p. ej.
// "restaurant"), sin traducir a una etiqueta: la tabla de traducción
// (CATEGORY_LABEL_KEY) vive en app/partners/category-label.ts, y lib/
// nunca importa de app/ en este proyecto — mantenerlo así evita invertir
// esa dependencia solo por este email operativo.
export function renderPartnerApplicationNotificationEmail(params: {
  businessName: string;
  category: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  submittedAt: string;
}): RenderedEmail {
  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(params.submittedAt));

  const fieldsHtml = [
    renderNotificationField(t("email.partnerApplicationNotification.fieldName"), params.businessName),
    renderNotificationField(t("email.partnerApplicationNotification.fieldCategory"), params.category),
    params.description
      ? renderNotificationField(t("email.partnerApplicationNotification.fieldDescription"), params.description)
      : "",
    params.address
      ? renderNotificationField(t("email.partnerApplicationNotification.fieldAddress"), params.address)
      : "",
    params.contactEmail
      ? renderNotificationField(t("email.partnerApplicationNotification.fieldContactEmail"), params.contactEmail)
      : "",
    params.contactPhone
      ? renderNotificationField(t("email.partnerApplicationNotification.fieldContactPhone"), params.contactPhone)
      : "",
    renderNotificationField(t("email.partnerApplicationNotification.fieldSubmittedAt"), formattedDate),
  ].join("");

  const bodyHtml = `
    <p style="margin:0 0 16px;">${t("email.partnerApplicationNotification.intro")}</p>
    ${fieldsHtml}
    <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">${t("email.partnerApplicationNotification.reviewInstructions")}</p>
  `;

  return {
    subject: t("email.partnerApplicationNotification.subject"),
    html: renderEmailLayout({
      previewText: t("email.partnerApplicationNotification.previewText"),
      title: t("email.partnerApplicationNotification.title"),
      bodyHtml,
    }),
  };
}
