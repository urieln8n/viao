// FPR-HOTELS-COMMERCIAL-01/02 — Tests de sanitizeHotelbedsErrorBody() y
// logHotelbedsHttpError(). Ninguna llamada real a Hotelbeds ni a
// console.error real fuera de este archivo — se intercepta
// console.error temporalmente para verificar la forma exacta del log,
// nunca se deja escribir a stdout de verdad durante el test.

import { test } from "node:test";
import assert from "node:assert/strict";

import { logHotelbedsHttpError, sanitizeHotelbedsErrorBody } from "./log-http-error";

test("sanitizeHotelbedsErrorBody: body sin claves sensibles, se conserva tal cual", () => {
  const body = { error: { code: "AVAILIBILITY-ERROR", message: "No rooms available" } };
  const result = sanitizeHotelbedsErrorBody(body);
  assert.deepEqual(result, body);
});

test("sanitizeHotelbedsErrorBody: redacta claves que parecen credenciales, en cualquier nivel de anidamiento", () => {
  const body = {
    error: "some error",
    apiKey: "should-never-appear",
    nested: { secret: "also-should-never-appear", ok: "fine" },
    Authorization: "Bearer fake",
  };
  const result = sanitizeHotelbedsErrorBody(body) as Record<string, unknown>;
  assert.equal(result.apiKey, "[REDACTED]");
  assert.equal(result.Authorization, "[REDACTED]");
  assert.equal((result.nested as Record<string, unknown>).secret, "[REDACTED]");
  assert.equal((result.nested as Record<string, unknown>).ok, "fine");
  assert.equal(result.error, "some error");
});

test("sanitizeHotelbedsErrorBody: redacta X-Signature, holder y datos de tarjeta por nombre de clave", () => {
  const body = {
    "X-Signature": "fake-signature",
    holderName: "Juan",
    cardNumber: "4111111111111111",
    cvv: "123",
    passengerList: ["a", "b"],
  };
  const result = sanitizeHotelbedsErrorBody(body) as Record<string, unknown>;
  assert.equal(result["X-Signature"], "[REDACTED]");
  assert.equal(result.holderName, "[REDACTED]");
  assert.equal(result.cardNumber, "[REDACTED]");
  assert.equal(result.cvv, "[REDACTED]");
  assert.equal(result.passengerList, "[REDACTED]");
});

test("sanitizeHotelbedsErrorBody: body no-objeto (string/número/null/undefined) se devuelve tal cual", () => {
  assert.equal(sanitizeHotelbedsErrorBody("plain text error"), "plain text error");
  assert.equal(sanitizeHotelbedsErrorBody(403), 403);
  assert.equal(sanitizeHotelbedsErrorBody(null), null);
  assert.equal(sanitizeHotelbedsErrorBody(undefined), undefined);
});

test("sanitizeHotelbedsErrorBody: array de objetos, sanea cada elemento", () => {
  const body = [{ apiKey: "x" }, { ok: "y" }];
  const result = sanitizeHotelbedsErrorBody(body) as Record<string, unknown>[];
  assert.equal(result[0].apiKey, "[REDACTED]");
  assert.equal(result[1].ok, "y");
});

// ── logHotelbedsHttpError: intercepta console.error, nunca escribe a stdout real en el test ──
function captureConsoleError(run: () => void): string[] {
  const original = console.error;
  const captured: string[] = [];
  console.error = (...args: unknown[]) => {
    captured.push(args.map(String).join(" "));
  };
  try {
    run();
  } finally {
    console.error = original;
  }
  return captured;
}

test("logHotelbedsHttpError: registra un único log estructurado con provider/endpoint/httpStatus/body saneado", () => {
  const logs = captureConsoleError(() => {
    logHotelbedsHttpError({
      endpoint: "booking",
      httpStatus: 403,
      body: { error: "quota exceeded", apiKey: "should-not-appear" },
      correlationId: "test-client-ref-123",
    });
  });

  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.provider, "hotelbeds");
  assert.equal(parsed.endpoint, "booking");
  assert.equal(parsed.httpStatus, 403);
  assert.equal(parsed.correlationId, "test-client-ref-123");
  assert.ok(!logs[0].includes("should-not-appear"));
  assert.ok(parsed.body.includes("quota exceeded"));
});

test("logHotelbedsHttpError: sin correlationId, el campo se omite en vez de aparecer undefined", () => {
  const logs = captureConsoleError(() => {
    logHotelbedsHttpError({ endpoint: "availability", httpStatus: 429, body: {} });
  });

  const parsed = JSON.parse(logs[0]);
  assert.equal("correlationId" in parsed, false);
});

test("logHotelbedsHttpError: nunca lanza aunque el body no sea serializable (referencia circular)", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;

  assert.doesNotThrow(() => {
    captureConsoleError(() => {
      logHotelbedsHttpError({ endpoint: "checkrate", httpStatus: 500, body: circular });
    });
  });
});
