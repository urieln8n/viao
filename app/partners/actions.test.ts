// Bloque Partners PB4 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Tests de
// las Server Actions de Actividad de Partner. Mismo motivo que
// app/trips/actions.test.ts: `auth.getUser()` fuera de una petición real
// de Next.js (sin cookies) resuelve `user: null` de forma controlada
// (fail-closed, no lanza) — comportamiento ya verificado y explotado por
// el resto del proyecto para testear la rama "sin sesión" sin necesitar
// un navegador real. El flujo completo autenticado (asociación real con
// auth.getUser()) se verifica contra el mismo mecanismo ya usado por
// redeemRewardAction/createTripAction — sin cambios aquí — y queda
// disponible para verificación de extremo a extremo cuando PB5 construya
// la UI que lo invoque desde un formulario real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { registerQrActivityAction, registerReservationActivityAction } from "./actions";

test("registerQrActivityAction: sin sesión real (fuera de una petición de Next.js) -> unauthenticated, no lanza", async () => {
  const result = await registerQrActivityAction(crypto.randomUUID(), crypto.randomUUID(), 10);
  assert.equal(result.outcome, "unauthenticated");
});

test("registerReservationActivityAction: sin sesión real (fuera de una petición de Next.js) -> unauthenticated, no lanza", async () => {
  const result = await registerReservationActivityAction(crypto.randomUUID(), crypto.randomUUID(), 10, "Mesa 4");
  assert.equal(result.outcome, "unauthenticated");
});
