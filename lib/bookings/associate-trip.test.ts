// F11-02 (VIAO_ROADMAP.md) — Tests de asociación de reserva a viaje
// contra Supabase local real. `associateBookingWithTrip` solo usa
// `createServiceRoleClient()` (sin `next/headers`), plenamente
// ejercitable aquí — mismo patrón que
// lib/bookings/update-booking-status.test.ts (F6-03).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";
import { associateBookingWithTrip } from "./associate-trip";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1102-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1102-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPropertyRow() {
  return upsertPropertyCache({
    providerName: "f1102_test_provider",
    providerPropertyId: `f1102-booking-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "F11-02 Test Hotel",
    city: "Madrid",
    country: "España",
  });
}

async function createTestBooking(userId: string) {
  const propertyRowId = await createTestPropertyRow();
  return createBookingRecord({
    userId,
    propertyRowId,
    checkIn: "2026-10-01",
    checkOut: "2026-10-04",
    guests: 2,
    providerBookingReference: `mock-f1102-${Date.now()}`,
  });
}

test("associateBookingWithTrip: asocia una reserva propia a un viaje propio, devuelve associated:true", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: trip } = await authedClient
      .from("trips")
      .insert({ user_id: userId, destination: "Test" })
      .select()
      .single();
    assert.ok(trip);
    const bookingId = await createTestBooking(userId);

    const result = await associateBookingWithTrip({ bookingId, tripId: trip.id, userId });
    assert.equal(result.associated, true);

    const { data: bookingRow } = await authedClient
      .from("bookings")
      .select("trip_id")
      .eq("id", bookingId)
      .single();
    assert.equal(bookingRow?.trip_id, trip.id);
  } finally {
    await deleteTestUser(userId);
  }
});

test("associateBookingWithTrip: asociar dos reservas propias al mismo viaje, ambas quedan vinculadas", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: trip } = await authedClient
      .from("trips")
      .insert({ user_id: userId, destination: "Test" })
      .select()
      .single();
    assert.ok(trip);
    const bookingId1 = await createTestBooking(userId);
    const bookingId2 = await createTestBooking(userId);

    await associateBookingWithTrip({ bookingId: bookingId1, tripId: trip.id, userId });
    await associateBookingWithTrip({ bookingId: bookingId2, tripId: trip.id, userId });

    const { data: rows } = await authedClient
      .from("bookings")
      .select("id")
      .eq("trip_id", trip.id);
    assert.equal(rows?.length, 2);
  } finally {
    await deleteTestUser(userId);
  }
});

test("associateBookingWithTrip: un usuario NO puede asociar la reserva de OTRO usuario (associated:false, la reserva ajena no se modifica)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const bookingId = await createTestBooking(owner.userId);
    const { data: attackerTrip } = await attacker.authedClient
      .from("trips")
      .insert({ user_id: attacker.userId, destination: "Attacker trip" })
      .select()
      .single();
    assert.ok(attackerTrip);

    const result = await associateBookingWithTrip({
      bookingId,
      tripId: attackerTrip.id,
      userId: attacker.userId,
    });
    assert.equal(result.associated, false, "no debe poder asociar una reserva ajena a su propio viaje");

    const service = createServiceRoleClient();
    const { data: bookingAfter } = await service
      .from("bookings")
      .select("trip_id")
      .eq("id", bookingId)
      .single();
    assert.equal(bookingAfter?.trip_id, null, "la reserva ajena no debe haberse modificado");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("associateBookingWithTrip: reserva inexistente -> associated:false, no lanza", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: trip } = await authedClient
      .from("trips")
      .insert({ user_id: userId, destination: "Test" })
      .select()
      .single();
    assert.ok(trip);

    const result = await associateBookingWithTrip({
      bookingId: "11111111-2222-3333-4444-555555555555",
      tripId: trip.id,
      userId,
    });
    assert.equal(result.associated, false);
  } finally {
    await deleteTestUser(userId);
  }
});

test("associateBookingWithTrip: repetir la misma asociación es idempotente (misma fila, mismo trip_id, sin error)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: trip } = await authedClient
      .from("trips")
      .insert({ user_id: userId, destination: "Test" })
      .select()
      .single();
    assert.ok(trip);
    const bookingId = await createTestBooking(userId);

    const first = await associateBookingWithTrip({ bookingId, tripId: trip.id, userId });
    const second = await associateBookingWithTrip({ bookingId, tripId: trip.id, userId });
    assert.equal(first.associated, true);
    assert.equal(second.associated, true);

    const { data: rows } = await authedClient.from("bookings").select("id").eq("trip_id", trip.id);
    assert.equal(rows?.length, 1, "repetir la asociación no debe duplicar ni romper nada");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Hallazgo de la revisión final de F11 (misma clase que el de F10 sobre
// photos_insert_own): un usuario NO puede usar SU PROPIA reserva
// legítima para asociarla al trip_id de OTRO usuario. Antes de la
// corrección (migración 20260818190000_grant_service_role_trips_select.sql
// + verificación interna en associateBookingWithTrip), esta llamada
// completaba con éxito. ──
test("associateBookingWithTrip: un usuario NO puede asociar SU PROPIA reserva legítima al trip_id de OTRO usuario", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const { data: ownerTrip } = await owner.authedClient
      .from("trips")
      .insert({ user_id: owner.userId, destination: "Owner trip" })
      .select()
      .single();
    assert.ok(ownerTrip);

    const attackerBookingId = await createTestBooking(attacker.userId);

    const result = await associateBookingWithTrip({
      bookingId: attackerBookingId,
      tripId: ownerTrip.id,
      userId: attacker.userId,
    });
    assert.equal(
      result.associated,
      false,
      "no debe poder asociar su propia reserva legítima al viaje de otro usuario",
    );

    const service = createServiceRoleClient();
    const { data: bookingAfter } = await service
      .from("bookings")
      .select("trip_id")
      .eq("id", attackerBookingId)
      .single();
    assert.equal(bookingAfter?.trip_id, null, "la reserva del atacante no debe haber quedado asociada al viaje ajeno");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("associateBookingWithTrip: trip_id inexistente -> associated:false, no lanza", async () => {
  const { userId } = await signUpUser();
  try {
    const bookingId = await createTestBooking(userId);
    const result = await associateBookingWithTrip({
      bookingId,
      tripId: "11111111-2222-3333-4444-555555555555",
      userId,
    });
    assert.equal(result.associated, false);
  } finally {
    await deleteTestUser(userId);
  }
});
