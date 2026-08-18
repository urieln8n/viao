// F10-01 (VIAO_ROADMAP.md) — Tests puros (sin I/O) de validate-image.
// Objetivo: demostrar que la validación ocurre server-side, antes de
// tocar OpenAI, y que NO se confía solo en la extensión/MIME declarado.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateImage } from "./validate-image";
import { VISION_MAX_IMAGE_SIZE_BYTES } from "./config";

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const NOT_AN_IMAGE_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

test("validateImage: imagen JPEG válida -> valid", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    sizeBytes: JPEG_BYTES.length,
    bytes: JPEG_BYTES,
  });
  assert.deepEqual(result, { valid: true });
});

test("validateImage: imagen PNG válida -> valid", () => {
  const result = validateImage({
    mimeType: "image/png",
    sizeBytes: PNG_BYTES.length,
    bytes: PNG_BYTES,
  });
  assert.deepEqual(result, { valid: true });
});

test("validateImage: imagen WEBP válida -> valid", () => {
  const result = validateImage({
    mimeType: "image/webp",
    sizeBytes: WEBP_BYTES.length,
    bytes: WEBP_BYTES,
  });
  assert.deepEqual(result, { valid: true });
});

test("validateImage: archivo vacío -> reason empty", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    sizeBytes: 0,
    bytes: new Uint8Array([]),
  });
  assert.deepEqual(result, { valid: false, reason: "empty" });
});

test("validateImage: supera el tamaño máximo -> reason too_large", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    sizeBytes: VISION_MAX_IMAGE_SIZE_BYTES + 1,
    bytes: JPEG_BYTES,
  });
  assert.deepEqual(result, { valid: false, reason: "too_large" });
});

test("validateImage: MIME type fuera de la lista permitida -> reason invalid_mime_type", () => {
  const result = validateImage({
    mimeType: "application/pdf",
    sizeBytes: NOT_AN_IMAGE_BYTES.length,
    bytes: NOT_AN_IMAGE_BYTES,
  });
  assert.deepEqual(result, { valid: false, reason: "invalid_mime_type" });
});

test("validateImage: MIME type declarado como imagen pero bytes reales de otro formato -> reason corrupted (no confía solo en la extensión/MIME declarado)", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    sizeBytes: NOT_AN_IMAGE_BYTES.length,
    bytes: NOT_AN_IMAGE_BYTES,
  });
  assert.deepEqual(result, { valid: false, reason: "corrupted" });
});

test("validateImage: PNG declarado pero con bytes de JPEG real -> reason corrupted", () => {
  const result = validateImage({
    mimeType: "image/png",
    sizeBytes: JPEG_BYTES.length,
    bytes: JPEG_BYTES,
  });
  assert.deepEqual(result, { valid: false, reason: "corrupted" });
});

test("validateImage: es una función pura (misma entrada -> misma salida)", () => {
  const input = { mimeType: "image/jpeg", sizeBytes: JPEG_BYTES.length, bytes: JPEG_BYTES };
  assert.deepEqual(validateImage(input), validateImage(input));
});
