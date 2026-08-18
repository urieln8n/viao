// F6-04 (VIAO_ROADMAP.md) — Tests de la Server Action que registra
// `booking_clicked`. Igual que `hotel_viewed`/`search_started` (F5-05),
// depende de `next/headers` (a través de `logAnalyticsEvent()` →
// `createClient()`), así que solo su contrato de "nunca lanza fuera de una
// petición real" es ejercitable aquí — la inserción real con un usuario
// autenticado se verifica en el reporte de la fase mediante navegador
// real (mismo límite ya documentado en F5-05/F5-06/F6-02 para pruebas de
// funciones dependientes de sesión).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { logBookingClickedAction } from "./log-booking-clicked-action";

test("logBookingClickedAction: no lanza fuera de una petición real de Next.js", async () => {
  await assert.doesNotReject(() =>
    logBookingClickedAction({ providerPropertyId: "mock-001" }),
  );
});

test("logBookingClickedAction: no lanza con un searchId inválido (se trata como ausente, igual que hotel_viewed)", async () => {
  await assert.doesNotReject(() =>
    logBookingClickedAction({
      providerPropertyId: "mock-001",
      searchId: "no-es-un-uuid",
    }),
  );
});

test("logBookingClickedAction: llama a logAnalyticsEvent con 'booking_clicked' y reutiliza isValidUuid, sin duplicar el regex", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/properties/[id]/log-booking-clicked-action.ts"),
    "utf-8",
  );

  assert.ok(
    /logAnalyticsEvent\(\s*"booking_clicked"/.test(source),
    "debe registrar exactamente el evento booking_clicked",
  );
  assert.ok(
    /import \{ isValidUuid \} from "\.\/resolve"/.test(source),
    "debe reutilizar isValidUuid de ./resolve, no redefinir la validación de formato UUID",
  );
  assert.ok(
    !/mock-provider|MockHotelProvider/i.test(source),
    "no debe referenciar el provider mock: este archivo es puro registro de analítica",
  );
});

test("LogBookingClickedInput no declara userId/user_id: la identidad viene solo de logAnalyticsEvent()/la sesión real", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/properties/[id]/log-booking-clicked-action.ts"),
    "utf-8",
  );

  const inputInterfaceMatch = source.match(/export interface LogBookingClickedInput \{([\s\S]*?)\}/);
  assert.ok(inputInterfaceMatch, "no se encontró la interfaz LogBookingClickedInput");
  assert.ok(
    !/userId|user_id/i.test(inputInterfaceMatch![1]),
    "LogBookingClickedInput no debe declarar userId/user_id",
  );
});
