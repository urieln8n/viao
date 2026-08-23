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
import { createServiceRoleClient } from "../supabase/service";

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

// ── FPR-04.10 — 9/11: runFullBookingFlow ahora pasa por booking_intents, igual que la Action real ──
test("FPR-04.10.9/11: runFullBookingFlow crea un booking intent real y lo completa tras persistir la reserva (booking_id vinculado)", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("fpr0410-intent-completed");
  try {
    const result = await runFullBookingFlow({
      userId,
      authedClient,
      destination: "Madrid",
      ...STAY,
    });

    const service = createServiceRoleClient();
    const { data: intentRow, error } = await service
      .from("booking_intents")
      .select("status, booking_id, client_reference")
      .eq("id", result.intentId)
      .single();

    assert.equal(error, null);
    assert.ok(intentRow);
    assert.equal(intentRow.status, "completed", "el intent debe quedar completed tras una reserva persistida con éxito (9)");
    assert.equal(intentRow.booking_id, result.bookingId);
    assert.ok(intentRow.client_reference, "el helper de integración usa de verdad booking_intents, no un flujo distinto (11)");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── FPR-04.10 — 12: una reserva duplicada concurrente solo produce UNA fila real en bookings ──
test("FPR-04.10.12: dos runFullBookingFlow concurrentes con la misma tupla -> solo uno tiene éxito, book() efectivamente se ejecuta una sola vez (una única fila en bookings)", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("fpr0410-concurrent");
  try {
    const [settledA, settledB] = await Promise.allSettled([
      runFullBookingFlow({ userId, authedClient, destination: "Madrid", ...STAY, withSearchRecord: false }),
      runFullBookingFlow({ userId, authedClient, destination: "Madrid", ...STAY, withSearchRecord: false }),
    ]);

    const outcomes = [settledA.status, settledB.status].sort();
    assert.deepEqual(outcomes, ["fulfilled", "rejected"], "exactamente uno debe tener éxito y el otro debe fallar (duplicate_booking_intent)");

    const rejected = settledA.status === "rejected" ? settledA : (settledB as PromiseRejectedResult);
    assert.match(String((rejected as PromiseRejectedResult).reason?.message ?? rejected.reason), /duplicate_booking_intent/);

    const service = createServiceRoleClient();
    const { data: bookings } = await service.from("bookings").select("id").eq("user_id", userId);
    assert.equal((bookings ?? []).length, 1, "book() y la persistencia solo deben completarse una vez para la tupla concurrente");
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
