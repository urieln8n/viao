// F6-02 (VIAO_ROADMAP.md) — Tests de la persistencia de `bookings` contra
// Supabase local real (no un mock). `createBookingRecord` usa
// `createServiceRoleClient()` (sin `next/headers`), así que es totalmente
// ejercitable aquí — ver el reporte de la fase para la verificación E2E
// real del flujo completo (incluida la sesión real de un usuario
// autenticado).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f602-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f602-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  // ON DELETE CASCADE (profiles→bookings vía user_id) limpia la reserva
  // asociada al borrar el usuario — mismo patrón que F5-06/F6-01.
  await service.auth.admin.deleteUser(userId);
}

async function createTestPropertyRow() {
  return upsertPropertyCache({
    providerName: "f602_test_provider",
    providerPropertyId: `f602-booking-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "F6-02 Booking Test Hotel",
    city: "Madrid",
    country: "España",
  });
}

// ── 8-14. La fila creada contiene exactamente los datos esperados ──
test("createBookingRecord: crea la fila con status=pending, datos correctos y campos económicos reales", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      searchId: undefined,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
      rooms: 1,
      providerBookingReference: "mock-booking-test-1",
      bookingValue: 270,
      providerCost: 250,
      currency: "EUR",
      holderName: "Juan",
      holderSurname: "Perez",
    });

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    assert.equal(error, null);
    assert.equal(data.user_id, userId); // 10. user_id correcto
    assert.equal(data.property_id, propertyRowId);
    assert.equal(data.check_in, "2026-10-01"); // 11. fechas correctas
    assert.equal(data.check_out, "2026-10-04");
    assert.equal(data.guests, 2); // 12. guests correcto
    assert.equal(data.status, "pending"); // 9. status inicial
    assert.equal(data.provider_booking_reference, "mock-booking-test-1");
    assert.equal(Number(data.booking_value), 270); // 2. amount/booking_value real (FPR-04.10)
    assert.equal(Number(data.provider_cost), 250); // 1. provider_cost real (FPR-04.10)
    assert.equal(data.currency, "EUR");
    assert.equal(data.provider_commission, null); // económico NULL: no se llama a getCommission()
    assert.equal(data.viao_revenue, null);
    assert.equal(data.reward_cost, null);
    assert.equal(data.search_id, null);
    // 13. rooms (FPR-04.10 — la migración 20260823130000 añadió la
    // columna, resolviendo la discrepancia que F6-02 había documentado).
    assert.equal(data.rooms, 1);
    // 3/4. holder_name/holder_surname (FPR-04.10).
    assert.equal(data.holder_name, "Juan");
    assert.equal(data.holder_surname, "Perez");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Campos económicos/nuevos NULL cuando el provider no los informa ──
test("createBookingRecord: sin bookingValue/currency/rooms/holder/providerCost/providerCancellationReference, todos quedan NULL (nunca inventados)", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
      guests: 1,
    });

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("bookings")
      .select(
        "booking_value, currency, provider_booking_reference, provider_cancellation_reference, provider_cost, holder_name, holder_surname, rooms, search_id",
      )
      .eq("id", bookingId)
      .single();

    assert.equal(error, null);
    assert.equal(data.booking_value, null);
    assert.equal(data.currency, "EUR"); // default de la columna, VIAO_DATABASE.md sección 6
    assert.equal(data.provider_booking_reference, null);
    assert.equal(data.provider_cancellation_reference, null);
    assert.equal(data.provider_cost, null);
    assert.equal(data.holder_name, null);
    assert.equal(data.holder_surname, null);
    assert.equal(data.rooms, null);
    assert.equal(data.search_id, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 6. providerCancellationReference solo aparece cuando el provider la informa ──
test("createBookingRecord: providerCancellationReference se persiste cuando se informa, NULL cuando no", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const withCancellationRef = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerCancellationReference: "HB-CANCEL-123",
    });
    const withoutCancellationRef = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-05",
      checkOut: "2026-10-08",
      guests: 1,
    });

    const service = createServiceRoleClient();
    const { data: rows, error } = await service
      .from("bookings")
      .select("id, provider_cancellation_reference")
      .in("id", [withCancellationRef, withoutCancellationRef]);

    assert.equal(error, null);
    const withRow = rows!.find((r) => r.id === withCancellationRef);
    const withoutRow = rows!.find((r) => r.id === withoutCancellationRef);
    assert.equal(withRow?.provider_cancellation_reference, "HB-CANCEL-123");
    assert.equal(withoutRow?.provider_cancellation_reference, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 7/8. Nunca se persiste paymentData ni datos de tarjeta/CVV: la propia tabla no tiene esas columnas ──
test("createBookingRecord: la fila persistida nunca contiene paymentData ni datos de tarjeta/CVV (esas columnas no existen en bookings)", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
    });

    const service = createServiceRoleClient();
    const { data, error } = await service.from("bookings").select("*").eq("id", bookingId).single();

    assert.equal(error, null);
    for (const forbiddenKey of [
      "payment_data",
      "card_number",
      "cvv",
      "card_cvv",
      "card_expiry",
      "rate_key",
      "client_reference",
    ]) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(data, forbiddenKey),
        `bookings no debe tener ninguna columna de pago/tarjeta/CVV ni rateKey/clientReference — encontrada "${forbiddenKey}"`,
      );
    }
  } finally {
    await deleteTestUser(userId);
  }
});

// ── search_id se persiste cuando se informa ──
test("createBookingRecord: con searchId informado, se persiste en bookings.search_id", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const { data: search, error: searchError } = await authedClient
      .from("searches")
      .insert({
        user_id: userId,
        destination: "Madrid",
        check_in: "2026-10-01",
        check_out: "2026-10-04",
        guests: 2,
        rooms: 1,
      })
      .select("id")
      .single();
    assert.equal(searchError, null);

    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      searchId: search.id,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
    });

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("bookings")
      .select("search_id")
      .eq("id", bookingId)
      .single();

    assert.equal(error, null);
    assert.equal(data.search_id, search.id);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS/GRANT: ni anon ni authenticated pueden insertar directamente (Patrón B) ──
test("un cliente anon no puede insertar en bookings (sin GRANT ni policy)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("bookings").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    property_id: "00000000-0000-0000-0000-000000000000",
    check_in: "2026-10-01",
    check_out: "2026-10-04",
    guests: 1,
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});

test("un usuario autenticado NO puede insertar en bookings directamente, ni siquiera con su propio user_id (Patrón B: solo service_role)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const { error } = await authedClient.from("bookings").insert({
      user_id: userId,
      property_id: propertyRowId,
      check_in: "2026-10-01",
      check_out: "2026-10-04",
      guests: 1,
    });

    assert.ok(
      error,
      "se esperaba que se rechazara el insert: bookings solo tiene policy de SELECT para authenticated (bookings_select_own), ninguna de INSERT",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// Actualizado en F6-03: la migración 20260818070000 (F6-02) concedía
// deliberadamente solo SELECT+INSERT a service_role sobre bookings,
// documentando que el UPDATE llegaría en F6-03 ("no se adelanta ese
// trabajo"). F6-03 añadió esa concesión
// (20260818090000_grant_service_role_bookings_update.sql) para la
// transición pending -> confirmed/cancelled — ver
// lib/bookings/update-booking-status.ts. Este test se actualiza para
// reflejar esa realidad ya no vale afirmar que el UPDATE sigue
// rechazado. El DELETE sigue sin concederse: ninguna fase lo necesita.
test("service_role SÍ tiene GRANT de UPDATE sobre bookings desde F6-03 (pending → confirmed/cancelled), pero sigue sin GRANT de DELETE", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
    });

    const service = createServiceRoleClient();
    const { error: updateError } = await service
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);
    assert.equal(
      updateError,
      null,
      "se esperaba que el UPDATE tuviera éxito: la migración 20260818090000 (F6-03) concede UPDATE a service_role",
    );

    const { error: deleteError } = await service.from("bookings").delete().eq("id", bookingId);
    assert.ok(
      deleteError,
      "se esperaba que Postgres siguiera rechazando el DELETE: ninguna migración lo ha concedido",
    );
  } finally {
    await deleteTestUser(userId);
  }
});
