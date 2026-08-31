// Mismo patrón exacto que lib/openai/client.test.ts (F9-01): sin
// RESEND_API_KEY, getResendClient() debe fallar de forma clara y
// controlada — nunca construir un cliente sin clave.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getResendClient } from "./resend-client";

test("getResendClient: sin RESEND_API_KEY, lanza un error claro (nunca construye un cliente sin clave)", () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    assert.throws(() => getResendClient(), /RESEND_API_KEY/);
  } finally {
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  }
});

test("getResendClient: con RESEND_API_KEY definida, construye un cliente sin lanzar", () => {
  const original = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_fake_key_solo_para_construir_el_cliente";
  try {
    assert.doesNotThrow(() => getResendClient());
  } finally {
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  }
});
