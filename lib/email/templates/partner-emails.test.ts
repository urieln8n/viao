import { test } from "node:test";
import assert from "node:assert/strict";

import {
  renderPartnerApplicationReceivedEmail,
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

test("las 3 plantillas escapan HTML del nombre del negocio (nunca inyectan marcado sin escapar)", () => {
  const malicious = 'Café <script>alert(1)</script> & "Cía"';
  const { html: received } = renderPartnerApplicationReceivedEmail({ businessName: malicious });
  const { html: approved } = renderPartnerApprovedEmail({
    businessName: malicious,
    dashboardUrl: "https://viao.vercel.app/partners/dashboard/abc",
  });
  const { html: rejected } = renderPartnerRejectedEmail({ businessName: malicious });

  for (const html of [received, approved, rejected]) {
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  }
});
