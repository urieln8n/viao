// Hotelbeds — tests de postHotelbeds(). Deliberadamente NO se prueba
// aquí ninguna llamada de red real (mismo criterio que
// lib/openai/client.test.ts y lib/hotelbeds/status.test.ts): solo los
// caminos de fallo rápido (credenciales/certificado ausentes), que no
// llegan a intentar ninguna conexión — así `npm test` nunca gasta cuota
// de sandbox.

import { test } from "node:test";
import assert from "node:assert/strict";

import { postHotelbeds } from "./http";

const HOTELBEDS_ENV_VARS = [
  "HOTELBEDS_API_KEY",
  "HOTELBEDS_SECRET",
  "HOTELBEDS_BASE_URL",
  "HOTELBEDS_CLIENT_CERT_PATH",
  "HOTELBEDS_CLIENT_KEY_PATH",
] as const;

/** Fija (o borra) varias variables de entorno, ejecuta `run` (posiblemente async), y siempre restaura los valores originales. */
async function withEnvValues(
  values: Partial<Record<(typeof HOTELBEDS_ENV_VARS)[number], string | undefined>>,
  run: () => Promise<void>,
): Promise<void> {
  const originals = new Map<string, string | undefined>();
  for (const name of HOTELBEDS_ENV_VARS) {
    originals.set(name, process.env[name]);
    const value = values[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    await run();
  } finally {
    for (const [name, original] of originals) {
      if (original === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = original;
      }
    }
  }
}

test("postHotelbeds: sin credenciales configuradas, devuelve outcome 'missing_credentials' sin intentar red", async () => {
  await withEnvValues({}, async () => {
    const result = await postHotelbeds("/hotel-api/1.0/hotels", { any: "body" });
    assert.equal(result.outcome, "missing_credentials");
  });
});

test("postHotelbeds: con credenciales pero sin certificado configurado, devuelve outcome 'missing_certificate' sin intentar red", async () => {
  await withEnvValues(
    {
      HOTELBEDS_API_KEY: "fake-key",
      HOTELBEDS_SECRET: "fake-secret",
      HOTELBEDS_BASE_URL: "https://api.test.hotelbeds.com",
    },
    async () => {
      const result = await postHotelbeds("/hotel-api/1.0/hotels", { any: "body" });
      assert.equal(result.outcome, "missing_certificate");
    },
  );
});

test("postHotelbeds: con certificado configurado pero apuntando a un archivo inexistente, devuelve outcome 'missing_certificate' sin intentar red", async () => {
  await withEnvValues(
    {
      HOTELBEDS_API_KEY: "fake-key",
      HOTELBEDS_SECRET: "fake-secret",
      HOTELBEDS_BASE_URL: "https://api.test.hotelbeds.com",
      HOTELBEDS_CLIENT_CERT_PATH: "./this-file-does-not-exist.pem",
      HOTELBEDS_CLIENT_KEY_PATH: "./this-file-does-not-exist.key",
    },
    async () => {
      const result = await postHotelbeds("/hotel-api/1.0/hotels", { any: "body" });
      assert.equal(result.outcome, "missing_certificate");
    },
  );
});
