// Bloque 11 ("Conexión del MVP para piloto") — Tests de
// `findOrCreateTripForBooking`. Depende de `next/headers` (cliente de
// sesión, igual que `getTripById`/`getUserTrips`/`createTripAction`), así
// que solo el camino "fuera de una petición real de Next.js" es
// ejercitable aquí directamente — a diferencia de esas funciones, esta NO
// captura ese fallo internamente (se apoya en que su único llamador real,
// `app/booking/actions.ts`, ya envuelve la llamada en su propio try/catch,
// mismo patrón de resiliencia que el resto del guard de reserva
// confirmada) — por eso aquí SÍ debe lanzar, en vez de devolver un
// resultado vacío. El comportamiento real (encontrar un viaje compatible,
// crear uno nuevo, reutilizar el más reciente) se verifica mediante
// navegador real en el reporte del bloque, igual que el resto de
// funciones de esta familia en el proyecto.

import { test } from "node:test";
import assert from "node:assert/strict";

import { findOrCreateTripForBooking } from "./find-or-create-trip-for-booking";

test("findOrCreateTripForBooking: fuera de una petición real de Next.js, lanza (no devuelve un resultado silencioso)", async () => {
  await assert.rejects(() =>
    findOrCreateTripForBooking({
      userId: "11111111-2222-3333-4444-555555555555",
      destination: "Madrid",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
    }),
  );
});
