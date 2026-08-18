// F9-01/F9-05 (VIAO_ROADMAP.md) — Tests de configuración centralizada:
// interruptor de emergencia (fail-closed), modelo/timeout, estimación de
// coste. Cada test restaura las variables de entorno que toca, para no
// contaminar los siguientes tests de este mismo archivo (node:test
// ejecuta los tests de un archivo en el mismo proceso, secuencialmente).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  estimateCostUsd,
  getOpenAiModel,
  getOpenAiTimeoutMs,
  isAiRecommendationsEnabled,
} from "./config";

function withEnv(name: string, value: string | undefined, run: () => void) {
  const original = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    run();
  } finally {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
}

// ── F9-05: kill switch fail-closed ──
test("isAiRecommendationsEnabled: sin la variable definida, deshabilitado (fail-closed)", () => {
  withEnv("AI_RECOMMENDATIONS_ENABLED", undefined, () => {
    assert.equal(isAiRecommendationsEnabled(), false);
  });
});

test('isAiRecommendationsEnabled: "true" exacto habilita', () => {
  withEnv("AI_RECOMMENDATIONS_ENABLED", "true", () => {
    assert.equal(isAiRecommendationsEnabled(), true);
  });
});

test("isAiRecommendationsEnabled: cualquier otro valor (mayúsculas, \"1\", texto arbitrario) deshabilita (fail-closed)", () => {
  for (const value of ["TRUE", "1", "yes", "enabled", " true", "true "]) {
    withEnv("AI_RECOMMENDATIONS_ENABLED", value, () => {
      assert.equal(
        isAiRecommendationsEnabled(),
        false,
        `se esperaba deshabilitado para el valor ${JSON.stringify(value)}`,
      );
    });
  }
});

test("isAiRecommendationsEnabled: cadena vacía deshabilita", () => {
  withEnv("AI_RECOMMENDATIONS_ENABLED", "", () => {
    assert.equal(isAiRecommendationsEnabled(), false);
  });
});

// ── F9-01: modelo/timeout configurables con valores por defecto ──
test("getOpenAiModel: valor por defecto sin OPENAI_MODEL", () => {
  withEnv("OPENAI_MODEL", undefined, () => {
    assert.equal(getOpenAiModel(), "gpt-4o-mini");
  });
});

test("getOpenAiModel: usa OPENAI_MODEL cuando está definida", () => {
  withEnv("OPENAI_MODEL", "gpt-4o", () => {
    assert.equal(getOpenAiModel(), "gpt-4o");
  });
});

test("getOpenAiTimeoutMs: valor por defecto sin OPENAI_TIMEOUT_MS", () => {
  withEnv("OPENAI_TIMEOUT_MS", undefined, () => {
    assert.equal(getOpenAiTimeoutMs(), 15_000);
  });
});

test("getOpenAiTimeoutMs: usa OPENAI_TIMEOUT_MS cuando es un número válido", () => {
  withEnv("OPENAI_TIMEOUT_MS", "5000", () => {
    assert.equal(getOpenAiTimeoutMs(), 5000);
  });
});

test("getOpenAiTimeoutMs: un valor no numérico o <= 0 cae al valor por defecto (nunca crashea)", () => {
  withEnv("OPENAI_TIMEOUT_MS", "no-es-un-numero", () => {
    assert.equal(getOpenAiTimeoutMs(), 15_000);
  });
  withEnv("OPENAI_TIMEOUT_MS", "-100", () => {
    assert.equal(getOpenAiTimeoutMs(), 15_000);
  });
});

// ── F9-04: coste ESTIMADO, nunca inventado para un modelo desconocido ──
test("estimateCostUsd: modelo conocido (gpt-4o-mini) produce un número coherente con la tabla de precios", () => {
  const cost = estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000);
  assert.equal(cost, 0.15 + 0.6);
});

test("estimateCostUsd: modelo desconocido devuelve undefined (nunca inventa un coste)", () => {
  const cost = estimateCostUsd("un-modelo-que-no-existe", 100, 100);
  assert.equal(cost, undefined);
});

test("estimateCostUsd: 0 tokens produce coste 0 para un modelo conocido", () => {
  const cost = estimateCostUsd("gpt-4o-mini", 0, 0);
  assert.equal(cost, 0);
});
