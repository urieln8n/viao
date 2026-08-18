// F12-05 (VIAO_ROADMAP.md) — Test de `recordReturnVisitAction()`. Depende
// de `next/headers` (a través de `createSessionClient()`), igual que
// `app/properties/[id]/log-booking-clicked-action.test.ts` — fuera de una
// petición real de Next.js no hay sesión, así que solo el camino
// "sin sesión -> no-op, no lanza" es ejercitable aquí. El comportamiento
// real autenticado (J/K/L) se prueba directamente contra
// `recordReturnVisitIfApplicable()` en
// lib/analytics/record-return-visit.test.ts (la pieza sin next/headers).

import { test } from "node:test";
import assert from "node:assert/strict";

import { recordReturnVisitAction } from "./actions";

test("recordReturnVisitAction: sin sesión real (fuera de una petición de Next.js) -> no-op, no lanza", async () => {
  await assert.doesNotReject(() => recordReturnVisitAction());
});
