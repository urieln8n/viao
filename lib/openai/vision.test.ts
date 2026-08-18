// F10-02/F10-05 (VIAO_ROADMAP.md) — Tests del wrapper de Vision. Mismo
// criterio que lib/openai/index.test.ts (F9): un grupo siempre se
// ejecuta (kill switch, sin credenciales reales), otro requiere
// OPENAI_API_KEY + RUN_REAL_OPENAI_TESTS=true explícitos.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateVisionScan } from "./vision";

// Un JPEG mínimo válido de verdad (1x1 px), en base64 — necesario porque
// las llamadas reales lo envían tal cual a la API de OpenAI.
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

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

// ── F10-05: kill switch deshabilitado -> nunca se intenta ninguna llamada a OpenAI ──
test("generateVisionScan: deshabilitado -> status disabled, sin lanzar (aunque falte OPENAI_API_KEY, prueba de que nunca se intentó llamar)", async () => {
  await withEnv({ VISION_ENABLED: undefined, OPENAI_API_KEY: undefined }, async () => {
    const result = await generateVisionScan({
      imageBase64: TINY_JPEG_BASE64,
      mimeType: "image/jpeg",
      targetLanguage: "es",
    });
    assert.deepEqual(result, { status: "disabled" });
  });
});

// ── Habilitado pero mal configurado (sin clave): error de despliegue ──
test("generateVisionScan: habilitado sin OPENAI_API_KEY -> lanza (fallo de configuración, no se confunde con kill switch)", async () => {
  await withEnv({ VISION_ENABLED: "true", OPENAI_API_KEY: undefined }, async () => {
    await assert.rejects(
      () =>
        generateVisionScan({
          imageBase64: TINY_JPEG_BASE64,
          mimeType: "image/jpeg",
          targetLanguage: "es",
        }),
      /OPENAI_API_KEY/,
    );
  });
});

// ── Llamadas REALES, condicionadas a credenciales explícitas ──
const hasRealCredentials =
  Boolean(process.env.OPENAI_API_KEY) &&
  process.env.RUN_REAL_OPENAI_TESTS === "true";

test(
  "generateVisionScan: llamada REAL a OpenAI devuelve un resultado con las tres claves esperadas",
  { skip: !hasRealCredentials && "requiere OPENAI_API_KEY + RUN_REAL_OPENAI_TESTS=true" },
  async () => {
    await withEnv({ VISION_ENABLED: "true" }, async () => {
      const result = await generateVisionScan({
        imageBase64: TINY_JPEG_BASE64,
        mimeType: "image/jpeg",
        targetLanguage: "es",
      });

      assert.equal(result.status, "success");
      if (result.status !== "success") return;
      assert.equal(typeof result.sourceLanguage, "string");
      assert.equal(typeof result.translatedText, "string");
      assert.equal(typeof result.explanation, "string");
      console.log(
        `[F10 evidencia] modelo vision, explanation="${result.explanation.slice(0, 200)}"`,
      );
    });
  },
);

test(
  "generateVisionScan: llamada REAL con MIME type no soportado por el modelo -> provider_error, sin lanzar",
  { skip: !hasRealCredentials && "requiere OPENAI_API_KEY + RUN_REAL_OPENAI_TESTS=true" },
  async () => {
    await withEnv({ VISION_ENABLED: "true" }, async () => {
      const result = await generateVisionScan({
        imageBase64: "not-a-real-base64-image",
        mimeType: "image/jpeg",
        targetLanguage: "es",
      });

      assert.equal(result.status, "provider_error");
      if (result.status !== "provider_error") return;
      assert.ok(result.message.length > 0);
    });
  },
);
