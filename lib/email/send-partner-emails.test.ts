// Prueba de integración ligera: sin RESEND_API_KEY (nunca configurada en
// npm test), las 3 funciones deben degradar de forma controlada
// (sent:false) sin lanzar y sin enviar ningún email real. El contenido
// exacto de cada plantilla ya se prueba en templates/partner-emails.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import type { ResendLikeClient } from "./send-email";
import {
  sendPartnerApplicationReceivedEmail,
  sendPartnerApplicationNotificationEmail,
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
} from "./send-partner-emails";

function withEnvVar(name: string, value: string | undefined, fn: () => Promise<void>): Promise<void> {
  const original = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return fn().finally(() => {
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  });
}

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

const NOTIFICATION_PARAMS = {
  businessName: "Café Barcelona",
  category: "restaurant",
  contactEmail: "hola@cafebarcelona.example",
  submittedAt: "2026-08-31T10:00:00.000Z",
};

// Caso 1 (PARTNER APPLICATION NOTIFICATION V1) — PARTNER_NOTIFICATION_EMAIL
// configurada: se envía al destinatario correcto, verificado con un
// cliente inyectado (mismo patrón de DI que send-email.test.ts) — es la
// única forma de comprobar "a quién" sin depender de una llamada real a
// Resend.
test("sendPartnerApplicationNotificationEmail: con PARTNER_NOTIFICATION_EMAIL configurada, envía al destinatario correcto", () =>
  withEnvVar("PARTNER_NOTIFICATION_EMAIL", "andres@example.com", async () => {
    let receivedTo: string | undefined;
    const fakeClient: ResendLikeClient = {
      emails: {
        send: async (params) => {
          receivedTo = params.to;
          return { data: { id: "fake-id" }, error: null };
        },
      },
    };

    const result = await sendPartnerApplicationNotificationEmail(NOTIFICATION_PARAMS, fakeClient);

    assert.deepEqual(result, { sent: true });
    assert.equal(receivedTo, "andres@example.com");
  }));

// Caso 2 — sin la variable configurada: se omite en silencio, sin
// siquiera intentar llamar al cliente (distinto de "Resend falla" —
// aquí no hay a quién escribir).
test("sendPartnerApplicationNotificationEmail: sin PARTNER_NOTIFICATION_EMAIL, no envía, no lanza, no llama al cliente", () =>
  withEnvVar("PARTNER_NOTIFICATION_EMAIL", undefined, async () => {
    let clientCalled = false;
    const fakeClient: ResendLikeClient = {
      emails: {
        send: async () => {
          clientCalled = true;
          return { data: { id: "fake-id" }, error: null };
        },
      },
    };

    const result = await sendPartnerApplicationNotificationEmail(NOTIFICATION_PARAMS, fakeClient);

    assert.deepEqual(result, { sent: false });
    assert.equal(clientCalled, false, "sin destinatario configurado, nunca debe llegar a llamar al cliente de Resend");
  }));

// Caso 3 — Resend falla: la función degrada a sent:false, nunca lanza
// (mismo contrato que sendEmail(), verificado end-to-end aquí también).
test("sendPartnerApplicationNotificationEmail: si Resend falla, devuelve sent:false y no lanza", () =>
  withEnvVar("PARTNER_NOTIFICATION_EMAIL", "andres@example.com", async () => {
    const fakeClient: ResendLikeClient = {
      emails: {
        send: async () => ({ data: null, error: { message: "invalid from address" } }),
      },
    };

    const result = await sendPartnerApplicationNotificationEmail(NOTIFICATION_PARAMS, fakeClient);
    assert.deepEqual(result, { sent: false });
  }));

// Variante de Caso 2/3 — PARTNER_NOTIFICATION_EMAIL configurada pero sin
// RESEND_API_KEY ni cliente inyectado (el caso real por defecto en local
// sin Resend configurado): debe degradar exactamente igual que las otras
// 3 funciones de este archivo.
test("sendPartnerApplicationNotificationEmail: con destinatario configurado pero sin RESEND_API_KEY, no lanza y devuelve sent:false", () =>
  withEnvVar("PARTNER_NOTIFICATION_EMAIL", "andres@example.com", () =>
    withEnvVar("RESEND_API_KEY", undefined, async () => {
      const result = await sendPartnerApplicationNotificationEmail(NOTIFICATION_PARAMS);
      assert.deepEqual(result, { sent: false });
    })));
