// FPR-HOTELS-COMMERCIAL-01/02 — Tests de decodeHotelbedsResponseBuffer().
// Buffers gzip generados EN MEMORIA con node:zlib, nunca contra Hotelbeds
// real — misma disciplina que el resto de lib/hotelbeds/*.test.ts (npm
// test nunca gasta cuota de sandbox).

import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";

import { decodeHotelbedsResponseBuffer } from "./response-body";

test("decodeHotelbedsResponseBuffer: Content-Encoding ausente, devuelve el buffer tal cual como utf8", () => {
  const buffer = Buffer.from('{"hello":"world"}', "utf8");
  const result = decodeHotelbedsResponseBuffer(buffer, undefined);
  assert.equal(result, '{"hello":"world"}');
});

test("decodeHotelbedsResponseBuffer: Content-Encoding 'gzip', descomprime correctamente", () => {
  const original = JSON.stringify({ hotels: { total: 2, hotels: [{ code: 1 }, { code: 2 }] } });
  const compressed = gzipSync(Buffer.from(original, "utf8"));
  const result = decodeHotelbedsResponseBuffer(compressed, "gzip");
  assert.equal(result, original);
});

test("decodeHotelbedsResponseBuffer: Content-Encoding 'GZIP' (mayúsculas), sigue descomprimiendo (case-insensitive)", () => {
  const original = '{"a":1}';
  const compressed = gzipSync(Buffer.from(original, "utf8"));
  const result = decodeHotelbedsResponseBuffer(compressed, "GZIP");
  assert.equal(result, original);
});

test("decodeHotelbedsResponseBuffer: Content-Encoding con otro valor (no gzip), se trata como sin comprimir", () => {
  const buffer = Buffer.from('{"a":1}', "utf8");
  const result = decodeHotelbedsResponseBuffer(buffer, "identity");
  assert.equal(result, '{"a":1}');
});

test("decodeHotelbedsResponseBuffer: buffer vacío sin Content-Encoding, devuelve string vacío", () => {
  const result = decodeHotelbedsResponseBuffer(Buffer.alloc(0), undefined);
  assert.equal(result, "");
});

test("decodeHotelbedsResponseBuffer: Content-Encoding 'gzip' pero buffer NO es gzip válido, nunca lanza (degrada a texto tal cual)", () => {
  const buffer = Buffer.from("esto no es gzip", "utf8");
  assert.doesNotThrow(() => decodeHotelbedsResponseBuffer(buffer, "gzip"));
  const result = decodeHotelbedsResponseBuffer(buffer, "gzip");
  assert.equal(typeof result, "string");
});

test("decodeHotelbedsResponseBuffer: respuesta gzip con caracteres UTF-8 multibyte (acentos), se preservan correctamente", () => {
  const original = JSON.stringify({ name: "Hotel Andalucía, Málaga" });
  const compressed = gzipSync(Buffer.from(original, "utf8"));
  const result = decodeHotelbedsResponseBuffer(compressed, "gzip");
  assert.equal(result, original);
  assert.ok(result.includes("Andalucía"));
});
