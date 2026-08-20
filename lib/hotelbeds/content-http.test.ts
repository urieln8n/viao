// Hotelbeds — tests de getHotelbedsContent(). Mismo criterio que
// lib/hotelbeds/http.test.ts: solo el camino de fallo rápido
// (credenciales ausentes), que no llega a intentar ninguna conexión —
// así `npm test` nunca gasta cuota de sandbox ni depende de red.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getHotelbedsContent } from "./content-http";

const HOTELBEDS_ENV_VARS = [
  "HOTELBEDS_API_KEY",
  "HOTELBEDS_SECRET",
  "HOTELBEDS_BASE_URL",
] as const;

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

test("getHotelbedsContent: sin credenciales configuradas, devuelve outcome 'missing_credentials' sin intentar red", async () => {
  await withEnvValues({}, async () => {
    const result = await getHotelbedsContent("/hotel-content-api/1.0/hotels?codes=1");
    assert.equal(result.outcome, "missing_credentials");
  });
});

test("getHotelbedsContent: no requiere HOTELBEDS_CLIENT_CERT_PATH/KEY_PATH (sin mTLS) — solo credenciales básicas hacen que deje de fallar por 'missing_credentials'", async () => {
  await withEnvValues(
    {
      HOTELBEDS_API_KEY: "fake-key",
      HOTELBEDS_SECRET: "fake-secret",
      // Host que no resuelve, a propósito: solo queremos comprobar que
      // el helper llega a INTENTAR la petición (outcome distinto de
      // "missing_credentials"/"missing_certificate" — este último ni
      // siquiera existe en su tipo de retorno) sin depender de red real.
      HOTELBEDS_BASE_URL: "https://this-host-does-not-resolve.invalid",
    },
    async () => {
      const result = await getHotelbedsContent("/hotel-content-api/1.0/hotels?codes=1");
      assert.equal(result.outcome, "network_error");
    },
  );
});
