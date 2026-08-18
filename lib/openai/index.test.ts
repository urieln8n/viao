// F9-01/F9-05 (VIAO_ROADMAP.md) — Tests del wrapper. Dos grupos:
//
// 1. Siempre se ejecutan (sin credenciales reales): kill switch
//    deshabilitado y kill switch habilitado sin clave configurada. No
//    requieren Supabase ni OpenAI reales — `logAiRecommendationOutcome`
//    depende de `next/headers` (vía `logAnalyticsEvent`, F5-05) y fuera
//    de una petición real de Next.js resuelve a un no-op silencioso
//    (mismo criterio que el resto de la Fase 5/6/7/8 para logging desde
//    node:test) — no impide comprobar el `status` devuelto.
//
// 2. Solo se ejecutan si OPENAI_API_KEY Y RUN_REAL_OPENAI_TESTS=true
//    están presentes en el entorno de la prueba — llamadas REALES,
//    mínimas, controladas, a la API de OpenAI (ver el reporte de la fase
//    para el modelo/coste documentado). "No inventes una llamada real si
//    las credenciales no están disponibles" (instrucción de la fase): si
//    no están, estos tests se marcan `skip`, nunca se simulan como si
//    hubieran pasado.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateSearchRecommendation } from "./index";

const SEARCH_PARAMS = {
  destination: "Madrid",
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  guests: 2,
  rooms: 1,
};

const ONE_RESULT = [
  {
    providerPropertyId: "mock-001",
    name: "Hotel VIAO Test",
    city: "Madrid",
    country: "España",
    rating: 4.2,
    price: { amount: 100, currency: "EUR" },
  },
];

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    originals[key] = process.env[key];
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return run().finally(() => {
    for (const key of Object.keys(originals)) {
      const original = originals[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });
}

// ── F9-05: kill switch deshabilitado -> nunca se intenta ninguna llamada a OpenAI ──
test("generateSearchRecommendation: deshabilitado -> status disabled, sin lanzar (aunque falte OPENAI_API_KEY, prueba de que nunca se intentó llamar)", async () => {
  await withEnv(
    { AI_RECOMMENDATIONS_ENABLED: undefined, OPENAI_API_KEY: undefined },
    async () => {
      const result = await generateSearchRecommendation({
        searchId: "11111111-2222-3333-4444-555555555555",
        searchParams: SEARCH_PARAMS,
        results: ONE_RESULT,
      });
      assert.deepEqual(result, { status: "disabled" });
    },
  );
});

// ── Habilitado pero mal configurado (sin clave): error de despliegue, no un "disabled" silencioso ──
test("generateSearchRecommendation: habilitado sin OPENAI_API_KEY -> lanza (fallo de configuración, no se confunde con kill switch)", async () => {
  await withEnv(
    { AI_RECOMMENDATIONS_ENABLED: "true", OPENAI_API_KEY: undefined },
    async () => {
      await assert.rejects(
        () =>
          generateSearchRecommendation({
            searchId: "11111111-2222-3333-4444-555555555555",
            searchParams: SEARCH_PARAMS,
            results: ONE_RESULT,
          }),
        /OPENAI_API_KEY/,
      );
    },
  );
});

// ── Llamadas REALES, condicionadas a credenciales explícitas ──
const hasRealCredentials =
  Boolean(process.env.OPENAI_API_KEY) &&
  process.env.RUN_REAL_OPENAI_TESTS === "true";

test(
  "generateSearchRecommendation: llamada REAL exitosa a OpenAI devuelve una recomendación no vacía",
  { skip: !hasRealCredentials && "requiere OPENAI_API_KEY + RUN_REAL_OPENAI_TESTS=true" },
  async () => {
    await withEnv({ AI_RECOMMENDATIONS_ENABLED: "true" }, async () => {
      const result = await generateSearchRecommendation({
        searchId: "11111111-2222-3333-4444-555555555555",
        searchParams: SEARCH_PARAMS,
        results: ONE_RESULT,
      });

      assert.equal(result.status, "success");
      if (result.status !== "success") return;
      assert.ok(result.recommendation.trim().length > 0);
      console.log(
        `[F9 evidencia] modelo=${process.env.OPENAI_MODEL || "gpt-4o-mini"} recomendación="${result.recommendation.slice(0, 200)}"`,
      );
    });
  },
);

test(
  "generateSearchRecommendation: llamada REAL con modelo inválido -> provider_error, sin lanzar",
  { skip: !hasRealCredentials && "requiere OPENAI_API_KEY + RUN_REAL_OPENAI_TESTS=true" },
  async () => {
    await withEnv(
      { AI_RECOMMENDATIONS_ENABLED: "true", OPENAI_MODEL: "viao-modelo-que-no-existe-xyz" },
      async () => {
        const result = await generateSearchRecommendation({
          searchId: "11111111-2222-3333-4444-555555555555",
          searchParams: SEARCH_PARAMS,
          results: ONE_RESULT,
        });

        assert.equal(result.status, "provider_error");
        if (result.status !== "provider_error") return;
        assert.ok(result.message.length > 0);
      },
    );
  },
);
