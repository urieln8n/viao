// Prueba de integración ligera: sin RESEND_API_KEY (nunca configurada en
// npm test), las 3 funciones deben degradar de forma controlada
// (sent:false) sin lanzar y sin enviar ningún email real. El contenido
// exacto de cada plantilla ya se prueba en templates/partner-emails.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sendPartnerApplicationReceivedEmail,
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
} from "./send-partner-emails";

test("sendPartnerApplicationReceivedEmail: sin RESEND_API_KEY, no lanza y devuelve sent:false", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendPartnerApplicationReceivedEmail({
      to: "comercio@example.com",
      businessName: "Café Núñez",
    });
    assert.deepEqual(result, { sent: false });
  } finally {
    if (original === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = original;
  }
});

test("sendPartnerApprovedEmail: sin RESEND_API_KEY, no lanza y devuelve sent:false", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendPartnerApprovedEmail({
      to: "comercio@example.com",
      businessName: "Café Núñez",
      dashboardUrl: "https://viao.vercel.app/partners/dashboard/abc-123",
    });
    assert.deepEqual(result, { sent: false });
  } finally {
    if (original === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = original;
  }
});

test("sendPartnerRejectedEmail: sin RESEND_API_KEY, no lanza y devuelve sent:false", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendPartnerRejectedEmail({
      to: "comercio@example.com",
      businessName: "Café Núñez",
    });
    assert.deepEqual(result, { sent: false });
  } finally {
    if (original === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = original;
  }
});
