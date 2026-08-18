// F11-02 (VIAO_ROADMAP.md) — Tests de la Server Action de asociación de
// reserva a viaje. `associateBookingAction` valida el formato de ambos
// ids ANTES de tocar `next/headers` — "input inválido" es ejercitable
// aquí directamente; "sin sesión real" también (fail-closed). El flujo
// completo autenticado (incluida ownership real del viaje) se verifica
// en lib/bookings/associate-trip.test.ts (la pieza sin next/headers) y
// en el reporte de la fase mediante navegador real.

import { test } from "node:test";
import assert from "node:assert/strict";

import { associateBookingAction } from "./actions";

test("associateBookingAction: tripId con formato inválido -> invalid_input", async () => {
  const result = await associateBookingAction("no-es-un-uuid", "11111111-2222-3333-4444-555555555555");
  assert.equal(result.status, "invalid_input");
});

test("associateBookingAction: bookingId con formato inválido -> invalid_input", async () => {
  const result = await associateBookingAction("11111111-2222-3333-4444-555555555555", "no-es-un-uuid");
  assert.equal(result.status, "invalid_input");
});

test("associateBookingAction: ambos ids ausentes -> invalid_input, no crashea", async () => {
  const result = await associateBookingAction(undefined, undefined);
  assert.equal(result.status, "invalid_input");
});

test("associateBookingAction: ids con formato válido pero sin sesión real (fuera de una petición de Next.js): unauthenticated, no lanza", async () => {
  const result = await associateBookingAction(
    "11111111-2222-3333-4444-555555555555",
    "22222222-3333-4444-5555-666666666666",
  );
  assert.equal(result.status, "unauthenticated");
});
