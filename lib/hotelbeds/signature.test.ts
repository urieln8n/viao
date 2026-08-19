// Hotelbeds — tests de la firma X-Signature. Puros y deterministas (el
// timestamp se pasa como parámetro, nunca Date.now() real), sin red ni
// credenciales reales — mismo criterio que lib/openai/config.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateHotelbedsSignature } from "./signature";

// Valor esperado calculado de forma independiente con node:crypto para
// esta misma entrada fija (apiKey="test-key", secret="test-secret",
// timestamp=1700000000), no adivinado ni copiado de ningún ejemplo de
// Hotelbeds — solo confirma que esta implementación calcula SHA-256(apiKey
// + secret + timestamp) en hexadecimal, tal como documenta Hotelbeds.
test("generateHotelbedsSignature: SHA-256 hexadecimal de apiKey+secret+timestamp para una entrada fija conocida", () => {
  const signature = generateHotelbedsSignature({
    apiKey: "test-key",
    secret: "test-secret",
    timestampSeconds: 1700000000,
  });
  assert.equal(
    signature,
    "5af15c8229489a203ae6b015242f9f73ef9f67eae9e48b8c9d5154fd35dc4e66".slice(0, 64),
  );
});

test("generateHotelbedsSignature: siempre devuelve 64 caracteres hexadecimales en minúscula", () => {
  const signature = generateHotelbedsSignature({
    apiKey: "otra-key",
    secret: "otro-secreto",
    timestampSeconds: 1234567890,
  });
  assert.match(signature, /^[0-9a-f]{64}$/);
});

test("generateHotelbedsSignature: es determinista (misma entrada -> misma firma)", () => {
  const input = {
    apiKey: "k",
    secret: "s",
    timestampSeconds: 1000,
  };
  assert.equal(generateHotelbedsSignature(input), generateHotelbedsSignature(input));
});

test("generateHotelbedsSignature: cambiar el timestamp cambia la firma", () => {
  const a = generateHotelbedsSignature({ apiKey: "k", secret: "s", timestampSeconds: 1000 });
  const b = generateHotelbedsSignature({ apiKey: "k", secret: "s", timestampSeconds: 1001 });
  assert.notEqual(a, b);
});
