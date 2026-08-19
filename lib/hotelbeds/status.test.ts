// Hotelbeds — test del camino sin credenciales de checkHotelbedsStatus.
// Deliberadamente NO se prueba aquí ninguna llamada de red real (mismo
// criterio que lib/openai/client.test.ts: los tests automatizados nunca
// llaman a un proveedor externo real) — entre otras razones porque el
// sandbox de Hotelbeds tiene un límite de 50 peticiones/día, y una suite
// que corre en cada `npm test` lo agotaría en minutos. La llamada real
// contra el endpoint TEST se verifica aparte, una sola vez, de forma
// manual.

import { test } from "node:test";
import assert from "node:assert/strict";

import { checkHotelbedsStatus } from "./status";

test("checkHotelbedsStatus: sin credenciales configuradas, devuelve outcome 'missing_credentials' sin lanzar y sin intentar red", async () => {
  const original = {
    apiKey: process.env.HOTELBEDS_API_KEY,
    secret: process.env.HOTELBEDS_SECRET,
    baseUrl: process.env.HOTELBEDS_BASE_URL,
  };
  delete process.env.HOTELBEDS_API_KEY;
  delete process.env.HOTELBEDS_SECRET;
  delete process.env.HOTELBEDS_BASE_URL;
  try {
    const result = await checkHotelbedsStatus();
    assert.equal(result.outcome, "missing_credentials");
    if (result.outcome === "missing_credentials") {
      assert.match(result.message, /HOTELBEDS_API_KEY/);
    }
  } finally {
    for (const [name, value] of Object.entries(original)) {
      const envName =
        name === "apiKey"
          ? "HOTELBEDS_API_KEY"
          : name === "secret"
            ? "HOTELBEDS_SECRET"
            : "HOTELBEDS_BASE_URL";
      if (value === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = value;
      }
    }
  }
});
