// F9-02 (VIAO_ROADMAP.md) — Tests de la Server Action de recomendación
// IA. Mismo motivo que app/booking/actions.test.ts (F6-02) para usar
// node:test: `requestAiRecommendationAction` solo toca `next/headers`
// (sesión) DESPUÉS de validar el formato del `searchId` — los caminos de
// "input inválido" y "sin sesión real" son ejercitables aquí
// directamente, sin necesidad de una petición real de Next.js. El flujo
// completo con un usuario autenticado real (ownership, rate limit,
// resultados reales, recomendación) se verifica en el reporte de la fase
// mediante navegador real (app/search/ai-recommendation/page.tsx) — ver
// también lib/rate-limit/check-rate-limit.test.ts y
// lib/openai/index.test.ts para las piezas que sí son testables aquí sin
// sesión (no dependen de next/headers).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { requestAiRecommendationAction } from "./actions";

// ── searchId con formato inválido: rechazado antes de tocar la sesión ──
test("searchId con formato inválido: invalid_search_id, alcanzable sin sesión real", async () => {
  const result = await requestAiRecommendationAction("no-es-un-uuid");
  assert.equal(result.status, "invalid_search_id");
});

test("searchId ausente/tipo inesperado: invalid_search_id, no crashea", async () => {
  const result = await requestAiRecommendationAction(undefined);
  assert.equal(result.status, "invalid_search_id");
});

// ── Sin sesión real (fuera de una petición de Next.js): fail-closed ──
test("searchId con formato válido pero sin sesión real (fuera de una petición de Next.js): unauthenticated, no lanza", async () => {
  const result = await requestAiRecommendationAction(
    "11111111-2222-3333-4444-555555555555",
  );
  assert.equal(result.status, "unauthenticated");
});

// ── El cliente no puede enviar nada más que searchId ──
test("requestAiRecommendationAction solo declara un parámetro (searchId); nunca lee userId/user_id del input del cliente", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/ai-recommendation/actions.ts"),
    "utf-8",
  );

  const fnMatch = source.match(
    /export async function requestAiRecommendationAction\(([\s\S]*?)\)/,
  );
  assert.ok(fnMatch, "no se encontró la firma de requestAiRecommendationAction");
  assert.match(fnMatch![1], /rawSearchId/);
  assert.ok(
    !/rawSearchId\.userId|rawSearchId\.user_id/.test(source),
    "no debe leerse userId/user_id del parámetro del cliente",
  );
});

// ── Auditoría F9: única puerta de entrada a OpenAI ──
test("app/search/ai-recommendation/actions.ts nunca importa el paquete openai directamente", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/ai-recommendation/actions.ts"),
    "utf-8",
  );
  assert.ok(
    !/from ["']openai["']/.test(source),
    "la Server Action debe llamar únicamente a lib/openai/, nunca importar el SDK de OpenAI",
  );
  assert.match(source, /from ["'].*lib\/openai["']/);
});

test("app/search/ai-recommendation/ai-recommendation-view.tsx (Client Component) nunca importa openai ni next/headers", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "app/search/ai-recommendation/ai-recommendation-view.tsx",
    ),
    "utf-8",
  );
  assert.match(source, /^"use client";/);
  assert.ok(!/from ["']openai["']/.test(source));
  assert.ok(!/next\/headers/.test(source));
});
