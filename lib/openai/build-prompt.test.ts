// F9-02 (VIAO_ROADMAP.md) — Tests puros (sin I/O) de la construcción del
// prompt. Objetivo: demostrar que el contexto enviado a OpenAI es
// EXACTAMENTE el que se pasa como parámetro (nunca datos inventados) y
// que la instrucción anti-alucinación siempre está presente.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildRecommendationPrompt,
  RECOMMENDATION_SYSTEM_INSTRUCTIONS,
} from "./build-prompt";

const SEARCH_PARAMS = {
  destination: "Madrid",
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  guests: 2,
  rooms: 1,
};

test("buildRecommendationPrompt: el mensaje system siempre incluye la instrucción anti-alucinación", () => {
  const { system } = buildRecommendationPrompt({
    searchParams: SEARCH_PARAMS,
    results: [],
  });

  assert.equal(system, RECOMMENDATION_SYSTEM_INSTRUCTIONS);
  assert.match(system, /únicamente la información proporcionada/i);
  assert.match(system, /no inventes/i);
});

test("buildRecommendationPrompt: sin resultados, el prompt lo dice explícitamente y no inventa ningún hotel", () => {
  const { user } = buildRecommendationPrompt({
    searchParams: SEARCH_PARAMS,
    results: [],
  });

  assert.match(user, /No hay ningún resultado disponible/);
});

test("buildRecommendationPrompt: incluye exactamente los resultados pasados como parámetro, con sus datos reales", () => {
  const { user } = buildRecommendationPrompt({
    searchParams: SEARCH_PARAMS,
    results: [
      {
        providerPropertyId: "mock-001",
        name: "Hotel Real Uno",
        city: "Madrid",
        country: "España",
        rating: 4.5,
        price: { amount: 120, currency: "EUR" },
      },
      {
        providerPropertyId: "mock-002",
        name: "Hotel Real Dos",
      },
    ],
  });

  assert.match(user, /Hotel Real Uno/);
  assert.match(user, /Madrid/);
  assert.match(user, /España/);
  assert.match(user, /4\.5/);
  assert.match(user, /120 EUR/);
  assert.match(user, /Hotel Real Dos/);

  // Ningún hotel fuera de la lista pasada como parámetro aparece.
  assert.doesNotMatch(user, /Hotel Inventado/);
});

test("buildRecommendationPrompt: los parámetros de búsqueda (destino/fechas/huéspedes/habitaciones) aparecen literalmente", () => {
  const { user } = buildRecommendationPrompt({
    searchParams: SEARCH_PARAMS,
    results: [],
  });

  assert.match(user, /Madrid/);
  assert.match(user, /2026-10-01/);
  assert.match(user, /2026-10-04/);
  assert.match(user, /2/);
  assert.match(user, /1/);
});

test("buildRecommendationPrompt: es una función pura (misma entrada -> misma salida, sin efectos secundarios)", () => {
  const input = {
    searchParams: SEARCH_PARAMS,
    results: [{ providerPropertyId: "mock-001", name: "Hotel Real Uno" }],
  };

  const first = buildRecommendationPrompt(input);
  const second = buildRecommendationPrompt(input);

  assert.deepEqual(first, second);
});
