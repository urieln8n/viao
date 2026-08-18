// F11-01 (VIAO_ROADMAP.md) — Tests de la Server Action de creación de
// viaje. Mismo motivo que app/search/actions.test.ts (F5-02) para
// node:test: `createTripAction` valida el input ANTES de tocar
// `next/headers`, así que "input inválido" es ejercitable aquí
// directamente; "sin sesión real" también, porque el fallo de sesión se
// captura y se trata como no autenticado (fail-closed). El flujo
// completo autenticado se verifica en el reporte de la fase mediante
// navegador real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createTripAction } from "./actions";

test("createTripAction: destination vacío -> invalid_input, alcanzable sin sesión real", async () => {
  const result = await createTripAction({ destination: "" });
  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.destination);
});

test("createTripAction: endDate anterior a startDate -> invalid_input", async () => {
  const result = await createTripAction({
    destination: "Madrid",
    startDate: "2026-10-04",
    endDate: "2026-10-01",
  });
  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.endDate);
});

test("createTripAction: tipos inesperados en runtime no crashean", async () => {
  const malformed = { destination: 123 } as unknown as { destination: string };
  const result = await createTripAction(malformed);
  assert.equal(result.status, "invalid_input");
});

test("createTripAction: input válido pero sin sesión real (fuera de una petición de Next.js): unauthenticated, no lanza", async () => {
  const result = await createTripAction({ destination: "Madrid" });
  assert.equal(result.status, "unauthenticated");
});
