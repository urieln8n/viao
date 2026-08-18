// F9-01 (VIAO_ROADMAP.md) — getOpenAiClient() es el único punto del
// proyecto que construye un cliente OpenAI. Sin OPENAI_API_KEY, debe
// fallar de forma clara y controlada — nunca construir un cliente sin
// clave, y nunca leer la clave hasta que se invoca de verdad (para que
// build/tsc/tests que nunca llaman a la IA no la requieran).

import { test } from "node:test";
import assert from "node:assert/strict";

import { getOpenAiClient } from "./client";

test("getOpenAiClient: sin OPENAI_API_KEY, lanza un error claro (nunca construye un cliente sin clave)", () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.throws(() => getOpenAiClient(), /OPENAI_API_KEY/);
  } finally {
    if (original === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = original;
    }
  }
});

test("getOpenAiClient: con OPENAI_API_KEY definida, construye un cliente sin lanzar", () => {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-fake-key-solo-para-construir-el-cliente";
  try {
    assert.doesNotThrow(() => getOpenAiClient());
  } finally {
    if (original === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = original;
    }
  }
});
