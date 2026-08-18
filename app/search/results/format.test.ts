// F5-03 (VIAO_ROADMAP.md) — Tests de los formateadores puros del listado
// de resultados. Mismo motivo que el resto de la Fase 4/5 para usar
// `node:test` en vez de instalar Jest/Vitest, y para compilar a un
// directorio temporal antes de ejecutar (ver el comando exacto en el
// reporte de la fase).

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPropertyHref, formatLocation, formatPrice, formatRating } from "./format";

// ── precio ──
test("formatPrice: compone importe y moneda cuando hay precio", () => {
  assert.equal(formatPrice({ amount: 270, currency: "EUR" }), "270 EUR");
});

test("formatPrice: undefined cuando no hay precio (fallo puntual de getPrice, ver F5-03 en actions.ts)", () => {
  assert.equal(formatPrice(undefined), undefined);
});

// ── ubicación ──
test("formatLocation: combina ciudad y país cuando ambos existen", () => {
  assert.equal(
    formatLocation({ city: "Madrid", country: "España" }),
    "Madrid, España",
  );
});

test("formatLocation: usa solo el campo disponible cuando falta ciudad o país", () => {
  assert.equal(formatLocation({ city: undefined, country: "España" }), "España");
  assert.equal(formatLocation({ city: "Madrid", country: undefined }), "Madrid");
});

test("formatLocation: undefined cuando el proveedor no informó ni ciudad ni país", () => {
  assert.equal(formatLocation({ city: undefined, country: undefined }), undefined);
});

// ── valoración ──
test("formatRating: un decimal fijo cuando hay valoración", () => {
  assert.equal(formatRating(4.2), "4.2");
  assert.equal(formatRating(4), "4.0");
});

test("formatRating: undefined cuando el proveedor no informó valoración", () => {
  assert.equal(formatRating(undefined), undefined);
});

// ── F5-07: enlace de cada tarjeta al detalle, con search_id trazable ──
test("buildPropertyHref: incluye ?search_id= cuando hay searchId (F5-06 → F5-07)", () => {
  assert.equal(
    buildPropertyHref("mock-001", "11111111-2222-3333-4444-555555555555"),
    "/properties/mock-001?search_id=11111111-2222-3333-4444-555555555555",
  );
});

test("buildPropertyHref: sin query param cuando no hay searchId (usuario anónimo, F5-06)", () => {
  assert.equal(buildPropertyHref("mock-001", undefined), "/properties/mock-001");
});
