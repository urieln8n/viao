// FPR-HOTELS-COMMERCIAL-01/02 — Verifica que la página de reserva declara
// `maxDuration` suficiente para el requisito de certificación de
// Hotelbeds (esperar hasta 60s la confirmación de POST /bookings). No es
// observable ejecutando la página (Next.js aplica `maxDuration` a nivel
// de plataforma, no en tiempo de test de `node:test`) — se verifica
// estructuralmente, mismo criterio que otras comprobaciones de "forma del
// código" en este proyecto (ver app/search/actions.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("page.tsx declara maxDuration >= 60 (requisito de certificación de Hotelbeds para confirmar Booking)", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/booking/[propertyId]/page.tsx"),
    "utf-8",
  );

  const match = source.match(/export const maxDuration = (\d+)/);
  assert.ok(match, "falta 'export const maxDuration' en app/booking/[propertyId]/page.tsx");

  const value = Number(match![1]);
  assert.ok(
    value >= 60,
    `maxDuration debe ser >= 60 (Hotelbeds exige tolerar hasta 60s en la confirmación de Booking), encontrado: ${value}`,
  );
});

test("page.tsx no declara maxDuration en actions.ts (Next.js exige que se declare a nivel de página, nunca en el propio archivo \"use server\")", () => {
  const actionsSource = readFileSync(
    path.join(process.cwd(), "app/booking/actions.ts"),
    "utf-8",
  );

  assert.ok(
    !/export const maxDuration/.test(actionsSource),
    "maxDuration en actions.ts no tendría efecto (Next.js solo lo aplica a Server Actions cuando se declara en la página)",
  );
});
