// F14-03 (VIAO_ROADMAP.md) — Test de integración: búsqueda -> reserva,
// contra Supabase local real y el `MockHotelProvider` real (F4-04) — sin
// mocks de infraestructura, sin servicios externos (el provider activo
// ya es determinista y local por diseño, VIAO_ARCHITECTURE.md sección 9).
//
// Reproduce el flujo real completo (`runFullBookingFlow`,
// lib/integration/test-helpers.ts) porque `app/search/actions.ts` y
// `app/booking/actions.ts` dependen de `next/headers` y no son invocables
// fuera de una petición real — misma limitación ya documentada en cada
// `*.test.ts` de Server Actions de este proyecto.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  signUpIntegrationUser,
  deleteIntegrationUser,
  runFullBookingFlow,
} from "./test-helpers";

const STAY = {
  checkIn: "2026-11-01",
  checkOut: "2026-11-04", // 3 noches
  guests: 2,
  rooms: 1,
};

test("F14-03: flujo completo búsqueda -> reserva persiste correctamente en Postgres (user_id, property_id, importe, estado)", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("search-booking");
  try {
    const result = await runFullBookingFlow({
      userId,
      authedClient,
      destination: "Madrid",
      ...STAY,
    });

    assert.equal(result.bookingResult.status, "confirmed", "el mock siempre confirma cuando hay disponibilidad");
    assert.ok(result.bookingId);
    assert.ok(result.searchId, "debe haberse creado una fila real en searches");

    // 6/7/8/9/10 — verificar la reserva REAL en Postgres, vía el propio usuario (RLS Patrón B, solo lectura).
    const { data: bookingRow, error } = await authedClient
      .from("bookings")
      .select("id, user_id, property_id, search_id, check_in, check_out, guests, status, booking_value, currency")
      .eq("id", result.bookingId)
      .single();

    assert.equal(error, null);
    assert.ok(bookingRow);
    assert.equal(bookingRow.user_id, userId, "user_id debe ser el del usuario real que reservó");
    assert.equal(bookingRow.property_id, result.propertyRowId, "property_id debe apuntar a la propiedad cacheada real");
    assert.equal(bookingRow.search_id, result.searchId, "search_id debe apuntar a la búsqueda real que originó la reserva");
    assert.equal(bookingRow.check_in, STAY.checkIn);
    assert.equal(bookingRow.check_out, STAY.checkOut);
    assert.equal(bookingRow.guests, STAY.guests);
    assert.equal(bookingRow.status, "confirmed", "debe reflejar el estado real devuelto por el provider (F6-03)");
    assert.equal(bookingRow.booking_value, result.bookingResult.amount, "el importe debe ser el real devuelto por provider.book()");
    assert.equal(bookingRow.currency, result.bookingResult.currency);

    // Verificar también la búsqueda real y el vínculo con la propiedad.
    const { data: searchRow } = await authedClient.from("searches").select("id, destination, results_count").eq("id", result.searchId).single();
    assert.ok(searchRow);
    assert.equal(searchRow.destination, "Madrid");
    assert.ok((searchRow.results_count as number) > 0);

    // 11 — evento booking_completed registrado (F6-04), verificado como parte del comportamiento ya existente.
    const service = (await import("../supabase/service")).createServiceRoleClient();
    const { data: events } = await service
      .from("analytics_events")
      .select("event_name")
      .eq("user_id", userId)
      .eq("event_name", "booking_completed");
    assert.ok((events ?? []).some((e) => e.event_name === "booking_completed"), "debe haberse registrado booking_completed (F6-04)");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

test("F14-03: una reserva sin disponibilidad suficiente no crea ninguna fila en bookings", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("search-booking-unavailable");
  try {
    // mock-003 (Boutique Casco Antiguo) solo tiene 1 habitación disponible (lib/travel-provider/mock-provider.ts).
    await assert.rejects(() =>
      runFullBookingFlow({
        userId,
        authedClient,
        destination: "Sevilla",
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
        guests: 2,
        rooms: 5, // supera la disponibilidad real del mock
      }),
    );

    const { data: bookings } = await authedClient.from("bookings").select("id");
    assert.equal((bookings ?? []).length, 0, "no debe haberse persistido ninguna reserva rechazada por falta de disponibilidad");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

test("F14-03: una reserva sin search_id (booking directo) sigue funcionando y persiste search_id=null", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("search-booking-nosearch");
  try {
    const result = await runFullBookingFlow({
      userId,
      authedClient,
      destination: "Barcelona",
      ...STAY,
      withSearchRecord: false,
    });

    assert.equal(result.searchId, undefined);

    const { data: bookingRow } = await authedClient.from("bookings").select("search_id").eq("id", result.bookingId).single();
    assert.equal(bookingRow?.search_id, null);
  } finally {
    await deleteIntegrationUser(userId);
  }
});
