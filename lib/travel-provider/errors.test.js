// F4-03 (VIAO_ROADMAP.md) — Casos de prueba del modelo de errores.
//
// VIAO_ARCHITECTURE.md sección 34 marca el framework de testing como
// "no fijado todavía" (sección 27). Para no invertir esa decisión de
// producto sin autorización, estas pruebas usan el runner de tests
// integrado en Node (`node:test`, disponible en el propio runtime desde
// Node 18) en vez de instalar Jest/Vitest u otra librería nueva.
//
// Ejecutar con: node --test lib/travel-provider/errors.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TravelProviderError,
  ProviderUnavailableError,
  ProviderError,
  ProviderNotSupportedError,
} from "./errors.ts";

test("ProviderUnavailableError se puede crear, conserva el mensaje y es distinguible", () => {
  const error = new ProviderUnavailableError(
    "No hay disponibilidad para esas fechas.",
  );

  assert.equal(error.message, "No hay disponibilidad para esas fechas.");
  assert.equal(error.name, "ProviderUnavailableError");
  assert.ok(error instanceof ProviderUnavailableError);
  assert.ok(error instanceof TravelProviderError);
  assert.ok(error instanceof Error);
  assert.ok(!(error instanceof ProviderError));
  assert.ok(!(error instanceof ProviderNotSupportedError));
});

test("ProviderError se puede crear, conserva el mensaje, la causa y es distinguible", () => {
  const originalError = new Error("fetch failed: ECONNRESET");
  const error = new ProviderError("Fallo técnico del proveedor.", {
    cause: originalError,
  });

  assert.equal(error.message, "Fallo técnico del proveedor.");
  assert.equal(error.name, "ProviderError");
  assert.equal(error.cause, originalError);
  assert.ok(error instanceof ProviderError);
  assert.ok(error instanceof TravelProviderError);
  assert.ok(!(error instanceof ProviderUnavailableError));
  assert.ok(!(error instanceof ProviderNotSupportedError));
});

test("ProviderError funciona también sin causa (opcional)", () => {
  const error = new ProviderError("Fallo técnico del proveedor.");
  assert.equal(error.cause, undefined);
});

test("ProviderNotSupportedError se puede crear, expone la capacidad y es distinguible", () => {
  const error = new ProviderNotSupportedError("cancelBooking");

  assert.equal(error.name, "ProviderNotSupportedError");
  assert.equal(error.capability, "cancelBooking");
  assert.match(error.message, /cancelBooking/);
  assert.ok(error instanceof ProviderNotSupportedError);
  assert.ok(error instanceof TravelProviderError);
  assert.ok(!(error instanceof ProviderUnavailableError));
  assert.ok(!(error instanceof ProviderError));
});

test("ProviderNotSupportedError acepta mensaje y causa personalizados", () => {
  const originalError = new Error("not implemented");
  const error = new ProviderNotSupportedError(
    "getCommission",
    "Este proveedor no expone comisión.",
    { cause: originalError },
  );

  assert.equal(error.message, "Este proveedor no expone comisión.");
  assert.equal(error.capability, "getCommission");
  assert.equal(error.cause, originalError);
});

test("los tres tipos de error son mutuamente distinguibles entre sí", () => {
  const unavailable = new ProviderUnavailableError("x");
  const provider = new ProviderError("x");
  const notSupported = new ProviderNotSupportedError("book");

  for (const error of [unavailable, provider, notSupported]) {
    assert.ok(error instanceof TravelProviderError);
    assert.ok(error instanceof Error);
  }

  assert.ok(unavailable instanceof ProviderUnavailableError);
  assert.ok(!(unavailable instanceof ProviderError));
  assert.ok(!(unavailable instanceof ProviderNotSupportedError));

  assert.ok(provider instanceof ProviderError);
  assert.ok(!(provider instanceof ProviderUnavailableError));
  assert.ok(!(provider instanceof ProviderNotSupportedError));

  assert.ok(notSupported instanceof ProviderNotSupportedError);
  assert.ok(!(notSupported instanceof ProviderUnavailableError));
  assert.ok(!(notSupported instanceof ProviderError));
});

test("TravelProviderError no se puede instanciar directamente en runtime", () => {
  assert.throws(
    // @ts-expect-error: TravelProviderError es abstracta a nivel de tipos;
    // esta prueba comprueba además que la restricción se cumple en
    // runtime, ya que `abstract` se elimina al compilar/transpilar.
    () => new TravelProviderError("x"),
    TypeError,
  );
});
