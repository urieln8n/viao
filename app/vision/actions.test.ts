// F10-00→F10-05 (VIAO_ROADMAP.md) — Tests de las Server Actions de
// Vision. Mismo motivo que app/booking/actions.test.ts (F6-02) y
// app/search/ai-recommendation/actions.test.ts (F9-02) para node:test:
// los 4 exports de este archivo solo tocan `next/headers` (sesión)
// DESPUÉS de comprobaciones que no la requieren (formato de scanId) o
// como primer paso (auth) — los caminos "sin sesión real" son
// ejercitables aquí directamente. El flujo completo autenticado
// (consentimiento -> validación -> rate limit -> OpenAI -> persistencia)
// se verifica en el reporte de la fase mediante navegador real
// (app/vision/page.tsx) — ver también lib/vision/*.test.ts y
// lib/openai/vision.test.ts para las piezas que sí son testables aquí
// sin sesión.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  scanVisionAction,
  grantVisionConsentAction,
  withdrawVisionConsentAction,
  deleteVisionScanAction,
} from "./actions";

// ── scanVisionAction: sin sesión real (fuera de una petición de Next.js) ──
test("scanVisionAction: sin sesión real, unauthenticated, no lanza (incluso con FormData vacío)", async () => {
  const result = await scanVisionAction(new FormData());
  assert.equal(result.status, "unauthenticated");
});

test("scanVisionAction: sin sesión real, unauthenticated incluso con una ruta de imagen adjunta (la sesión se comprueba antes que la imagen)", async () => {
  const formData = new FormData();
  formData.append("imagePath", "some-user-id/test.jpg");
  const result = await scanVisionAction(formData);
  assert.equal(result.status, "unauthenticated");
});

// ── grantVisionConsentAction / withdrawVisionConsentAction ──
test("grantVisionConsentAction: sin sesión real, unauthenticated, no lanza", async () => {
  const result = await grantVisionConsentAction();
  assert.equal(result.status, "unauthenticated");
});

test("withdrawVisionConsentAction: sin sesión real, unauthenticated, no lanza", async () => {
  const result = await withdrawVisionConsentAction();
  assert.equal(result.status, "unauthenticated");
});

// ── deleteVisionScanAction ──
test("deleteVisionScanAction: scanId con formato inválido, invalid_scan_id, alcanzable sin sesión real", async () => {
  const result = await deleteVisionScanAction("no-es-un-uuid");
  assert.equal(result.status, "invalid_scan_id");
});

test("deleteVisionScanAction: scanId ausente/tipo inesperado, invalid_scan_id, no crashea", async () => {
  const result = await deleteVisionScanAction(undefined);
  assert.equal(result.status, "invalid_scan_id");
});

test("deleteVisionScanAction: scanId con formato válido pero sin sesión real, unauthenticated", async () => {
  const result = await deleteVisionScanAction("11111111-2222-3333-4444-555555555555");
  assert.equal(result.status, "unauthenticated");
});

// ── Auditoría F10: el cliente no puede enviar user_id/consentimiento por su cuenta ──
test("scanVisionAction: nunca lee userId/user_id ni un booleano de consentimiento del FormData del cliente", () => {
  const source = readFileSync(path.join(process.cwd(), "app/vision/actions.ts"), "utf-8");
  assert.ok(
    !/formData\.get\(["']userId["']\)|formData\.get\(["']user_id["']\)|formData\.get\(["']consent["']\)/.test(source),
    "scanVisionAction no debe leer userId ni consent del FormData del cliente",
  );
});

test("app/vision/actions.ts nunca importa el paquete openai directamente", () => {
  const source = readFileSync(path.join(process.cwd(), "app/vision/actions.ts"), "utf-8");
  assert.ok(!/from ["']openai["']/.test(source));
  assert.match(source, /from ["'].*lib\/openai/);
});

test("app/vision/vision-view.tsx (Client Component) nunca importa openai ni next/headers", () => {
  const source = readFileSync(path.join(process.cwd(), "app/vision/vision-view.tsx"), "utf-8");
  assert.match(source, /^"use client";/);
  assert.ok(!/from ["']openai["']/.test(source));
  assert.ok(!/next\/headers/.test(source));
});
