import { test } from "node:test";
import assert from "node:assert/strict";

import {
  renderPartnerApplicationReceivedEmail,
  renderPartnerApplicationNotificationEmail,
  renderPartnerApprovedEmail,
  renderPartnerRejectedEmail,
} from "./partner-emails";

test("renderPartnerApplicationReceivedEmail: incluye el nombre del negocio y el asunto esperado, sin CTA", () => {
  const { subject, html } = renderPartnerApplicationReceivedEmail({
    businessName: "Café Núñez",
  });
  assert.equal(subject, "Hemos recibido tu solicitud para VIAO");
  assert.match(html, /Café Núñez/);
  assert.doesNotMatch(html, /<a href=/, "esta plantilla no lleva ningún CTA/enlace");
});

test("renderPartnerApprovedEmail: incluye el nombre del negocio y el enlace real al Dashboard", () => {
  const dashboardUrl = "https://viao.vercel.app/partners/dashboard/abc-123";
  const { subject, html } = renderPartnerApprovedEmail({
    businessName: "Café Núñez",
    dashboardUrl,
  });
  assert.equal(subject, "Tu negocio ya es Partner de VIAO");
  assert.match(html, /Café Núñez/);
  assert.match(html, new RegExp(`href="${dashboardUrl.replace(/\//g, "\\/")}"`));
});

test("renderPartnerRejectedEmail: incluye el nombre del negocio, sin CTA", () => {
  const { subject, html } = renderPartnerRejectedEmail({ businessName: "Café Núñez" });
  assert.equal(subject, "Tu solicitud para VIAO");
  assert.match(html, /Café Núñez/);
  assert.doesNotMatch(html, /<a href=/);
});

test("las 4 plantillas escapan HTML del nombre del negocio (nunca inyectan marcado sin escapar)", () => {
  const malicious = 'Café <script>alert(1)</script> & "Cía"';
  const { html: received } = renderPartnerApplicationReceivedEmail({ businessName: malicious });
  const { html: approved } = renderPartnerApprovedEmail({
    businessName: malicious,
    dashboardUrl: "https://viao.vercel.app/partners/dashboard/abc",
  });
  const { html: rejected } = renderPartnerRejectedEmail({ businessName: malicious });
  const { html: notification } = renderPartnerApplicationNotificationEmail({
    businessName: malicious,
    category: "restaurant",
    submittedAt: "2026-08-31T10:00:00.000Z",
  });

  for (const html of [received, approved, rejected, notification]) {
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  }
});

test("renderPartnerApplicationNotificationEmail: incluye nombre, categoría y fecha; nunca menciona access_token", () => {
  const { subject, html } = renderPartnerApplicationNotificationEmail({
    businessName: "Café Barcelona",
    category: "restaurant",
    submittedAt: "2026-08-31T10:00:00.000Z",
  });
  assert.equal(subject, "Nueva solicitud de Partner en VIAO");
  assert.match(html, /Café Barcelona/);
  assert.match(html, /restaurant/);
  assert.doesNotMatch(html, /access_token/i);
  assert.doesNotMatch(html, /<a href=/, "esta plantilla nunca lleva un botón de aprobar");
});

test("renderPartnerApplicationNotificationEmail: incluye los campos opcionales solo cuando están presentes", () => {
  const withOptionals = renderPartnerApplicationNotificationEmail({
    businessName: "Café Barcelona",
    category: "restaurant",
    description: "Cafetería de especialidad",
    address: "Calle Mayor 1",
    contactEmail: "hola@cafebarcelona.example",
    contactPhone: "+34 600 000 000",
    submittedAt: "2026-08-31T10:00:00.000Z",
  }).html;
  assert.match(withOptionals, /Cafetería de especialidad/);
  assert.match(withOptionals, /Calle Mayor 1/);
  assert.match(withOptionals, /hola@cafebarcelona\.example/);
  assert.match(withOptionals, /\+34 600 000 000/);

  const withoutOptionals = renderPartnerApplicationNotificationEmail({
    businessName: "Café Barcelona",
    category: "restaurant",
    submittedAt: "2026-08-31T10:00:00.000Z",
  }).html;
  assert.doesNotMatch(withoutOptionals, /Descripción/);
  assert.doesNotMatch(withoutOptionals, /Dirección/);
  assert.doesNotMatch(withoutOptionals, /Email de contacto/);
  assert.doesNotMatch(withoutOptionals, /Teléfono/);
});
