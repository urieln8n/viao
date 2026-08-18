// F12-01 (VIAO_ROADMAP.md) — Tests estructurales/unitarios de
// lib/analytics/posthog.ts. NO hay credenciales reales de PostHog en este
// entorno de desarrollo (sin NEXT_PUBLIC_POSTHOG_KEY en .env.example ni
// configurada) — no se fabrica un resultado de "evento realmente
// entregado a PostHog"; ver el reporte de F12 para esta limitación
// explícita. Estos tests cubren lo que SÍ es verificable sin red externa:
// el comportamiento no-op cuando no hay configuración, y que la
// configuración se lee correctamente cuando SÍ existe (sin llegar a
// hacer una petición HTTP real).

import { test } from "node:test";
import assert from "node:assert/strict";

import { isPostHogConfigured, getPostHogClientConfig, sendPostHogServerEvent } from "./posthog";

test("isPostHogConfigured: false cuando NEXT_PUBLIC_POSTHOG_KEY no está definida", () => {
  const original = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    assert.equal(isPostHogConfigured(), false);
  } finally {
    if (original !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = original;
  }
});

test("getPostHogClientConfig: undefined cuando no hay clave configurada", () => {
  const original = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    assert.equal(getPostHogClientConfig(), undefined);
  } finally {
    if (original !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = original;
  }
});

test("getPostHogClientConfig: devuelve key/host reales cuando SÍ hay configuración (sin red)", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_fake_key";
  process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://example-posthog-host.test";
  try {
    assert.equal(isPostHogConfigured(), true);
    const config = getPostHogClientConfig();
    assert.deepEqual(config, { key: "phc_test_fake_key", host: "https://example-posthog-host.test" });
  } finally {
    if (originalKey !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (originalHost !== undefined) process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
    else delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  }
});

test("getPostHogClientConfig: usa el host por defecto (https://us.i.posthog.com) si NEXT_PUBLIC_POSTHOG_HOST no está definida", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_fake_key";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  try {
    const config = getPostHogClientConfig();
    assert.equal(config?.host, "https://us.i.posthog.com");
  } finally {
    if (originalKey !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (originalHost !== undefined) process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
  }
});

test("sendPostHogServerEvent: no-op (no lanza, no hace red) sin configuración", async () => {
  const original = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    await assert.doesNotReject(() =>
      sendPostHogServerEvent("search_started", {}, "11111111-2222-3333-4444-555555555555"),
    );
  } finally {
    if (original !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = original;
  }
});

test("sendPostHogServerEvent: no-op sin userId, incluso con configuración presente (nunca fabrica un distinct_id anónimo server-side)", async () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_fake_key";
  try {
    await assert.doesNotReject(() => sendPostHogServerEvent("search_started", {}, null));
  } finally {
    if (originalKey !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  }
});
