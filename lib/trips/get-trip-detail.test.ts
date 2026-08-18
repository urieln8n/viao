// F11-04 (VIAO_ROADMAP.md) — `getTripDetail` depende de `next/headers`
// (vía `getTripById`/`createSessionClient`), así que solo el camino
// "fuera de una petición real de Next.js" es ejercitable aquí
// directamente — mismo criterio que el resto del proyecto para funciones
// atadas a sesión. La agregación real (reservas/fotos/escaneos/rewards)
// se verifica en el reporte de la fase mediante navegador real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getTripDetail } from "./get-trip-detail";

test("getTripDetail(): fuera de una petición real de Next.js devuelve undefined, no lanza", async () => {
  const result = await getTripDetail("11111111-2222-3333-4444-555555555555");
  assert.equal(result, undefined);
});
