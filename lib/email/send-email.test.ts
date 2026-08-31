// sendEmail() nunca debe lanzar ni enviar un email real desde `npm test`
// (pedido explícito del bloque) — se prueba con un doble de prueba
// inyectado (ResendLikeClient), sin librería de mocking y sin red real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { sendEmail, type ResendLikeClient } from "./send-email";

test("sendEmail: sin RESEND_API_KEY y sin cliente inyectado -> sent:false, nunca lanza", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendEmail({ to: "test@example.com", subject: "Asunto", html: "<p>Hola</p>" });
    assert.deepEqual(result, { sent: false });
  } finally {
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  }
});

test("sendEmail: envío correcto con el cliente inyectado -> sent:true", async () => {
  let receivedParams: unknown;
  const fakeClient: ResendLikeClient = {
    emails: {
      send: async (params) => {
        receivedParams = params;
        return { data: { id: "fake-id" }, error: null };
      },
    },
  };

  const result = await sendEmail(
    { to: "partner@example.com", subject: "Solicitud recibida", html: "<p>Hola</p>" },
    fakeClient,
  );

  assert.deepEqual(result, { sent: true });
  assert.deepEqual(receivedParams, {
    from: "VIAO <onboarding@resend.dev>",
    to: "partner@example.com",
    subject: "Solicitud recibida",
    html: "<p>Hola</p>",
  });
});

test("sendEmail: Resend devuelve error -> sent:false, no lanza", async () => {
  const fakeClient: ResendLikeClient = {
    emails: {
      send: async () => ({ data: null, error: { message: "invalid from address" } }),
    },
  };

  const result = await sendEmail(
    { to: "partner@example.com", subject: "x", html: "<p>x</p>" },
    fakeClient,
  );

  assert.deepEqual(result, { sent: false });
});

test("sendEmail: el cliente lanza una excepción -> sent:false, no propaga", async () => {
  const fakeClient: ResendLikeClient = {
    emails: {
      send: async () => {
        throw new Error("network error");
      },
    },
  };

  const result = await sendEmail(
    { to: "partner@example.com", subject: "x", html: "<p>x</p>" },
    fakeClient,
  );

  assert.deepEqual(result, { sent: false });
});

test("sendEmail: usa RESEND_FROM_EMAIL cuando está configurada", async () => {
  const original = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_FROM_EMAIL = "VIAO <no-reply@viao.app>";
  let receivedFrom: string | undefined;
  const fakeClient: ResendLikeClient = {
    emails: {
      send: async (params) => {
        receivedFrom = params.from;
        return { data: { id: "fake-id" }, error: null };
      },
    },
  };

  try {
    await sendEmail({ to: "partner@example.com", subject: "x", html: "<p>x</p>" }, fakeClient);
    assert.equal(receivedFrom, "VIAO <no-reply@viao.app>");
  } finally {
    if (original === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = original;
    }
  }
});
