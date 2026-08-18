// F6-03 (VIAO_ROADMAP.md) — Tests de la transición de estado de una
// reserva contra Supabase local real (no un mock). `updateBookingStatus`
// usa `createServiceRoleClient()` (sin `next/headers`), así que es
// totalmente ejercitable aquí — ver el reporte de la fase para la
// verificación E2E real del flujo completo a través de
// `app/booking/actions.ts` con una sesión real.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";
import { updateBookingStatus } from "./update-booking-status";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f603-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f603-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPropertyRow() {
  return upsertPropertyCache({
    providerName: "f603_test_provider",
    providerPropertyId: `f603-booking-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "F6-03 Booking Test Hotel",
    city: "Madrid",
    country: "España",
  });
}

// ── 1. Reserva exitosa: pending -> confirmed, misma fila, resto de campos intacto ──
test("updateBookingStatus: transiciona pending → confirmed sin crear otra fila y sin alterar el resto de columnas", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
      providerBookingReference: "mock-booking-f603-1",
      bookingValue: 270,
      currency: "EUR",
    });

    const service = createServiceRoleClient();
    const { data: before } = await service.from("bookings").select("*").eq("id", bookingId).single();
    assert.equal(before.status, "pending");

    await updateBookingStatus({ bookingId, userId, status: "confirmed" });

    const { data: after, error } = await service.from("bookings").select("*").eq("id", bookingId).single();
    assert.equal(error, null);

    // 7. Misma fila, sin duplicación.
    assert.equal(after.id, bookingId);
    assert.equal(after.status, "confirmed");
    // Campos que no debían tocarse.
    assert.equal(after.user_id, before.user_id);
    assert.equal(after.property_id, before.property_id);
    assert.equal(after.search_id, before.search_id);
    assert.equal(after.provider_booking_reference, before.provider_booking_reference);
    assert.equal(after.check_in, before.check_in);
    assert.equal(after.check_out, before.check_out);
    assert.equal(after.guests, before.guests);
    assert.equal(Number(after.booking_value), Number(before.booking_value));
    assert.equal(after.currency, before.currency);
    assert.equal(after.provider_commission, before.provider_commission);
    assert.equal(after.viao_revenue, before.viao_revenue);
    assert.equal(after.reward_cost, before.reward_cost);
    assert.equal(after.created_at, before.created_at);

    // No duplicación: sigue habiendo exactamente 1 fila para este usuario/propiedad.
    const { count } = await service
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    assert.equal(count, 1);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 5. Usuario autenticado no puede afectar una reserva ajena ──
test("updateBookingStatus: rechaza actualizar una reserva perteneciente a otro usuario (ownership)", async () => {
  const { userId: ownerId } = await createConfirmedTestUser();
  const { userId: attackerId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId: ownerId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
    });

    await assert.rejects(
      () => updateBookingStatus({ bookingId, userId: attackerId, status: "confirmed" }),
      /No se pudo actualizar el estado/,
      "se esperaba que el intento de otro usuario fuera rechazado",
    );

    const service = createServiceRoleClient();
    const { data, error } = await service.from("bookings").select("status").eq("id", bookingId).single();
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.status, "pending", "la reserva del propietario real no debe verse afectada por el intento ajeno");
  } finally {
    await deleteTestUser(ownerId);
    await deleteTestUser(attackerId);
  }
});

// ── RLS/GRANT: ni anon ni authenticated pueden hacer UPDATE directo (Patrón B) ──
test("un cliente anon no puede hacer UPDATE en bookings (sin GRANT ni policy)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", "00000000-0000-0000-0000-000000000000");

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el UPDATE desde el cliente anon");
});

test("un usuario autenticado no puede hacer UPDATE en bookings directamente, ni siquiera sobre su propia reserva (Patrón B: solo service_role)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
    });

    const { error } = await authedClient
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    assert.ok(
      error,
      "se esperaba que se rechazara el UPDATE: bookings solo tiene policy de SELECT para authenticated, ninguna de UPDATE",
    );
  } finally {
    await deleteTestUser(userId);
  }
});
