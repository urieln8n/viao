// FPR-04.12 — Tests de get-booking-by-id.ts contra Supabase local real
// (no un mock) — mismo criterio que create-booking-record.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";
import { getBookingById } from "./get-booking-by-id";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `fpr0412-getbooking-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "fpr0412-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPropertyRow() {
  return upsertPropertyCache({
    providerName: "fpr0412_test_provider",
    providerPropertyId: `fpr0412-getbooking-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "FPR-04.12 GetBooking Test Hotel",
  });
}

test("getBookingById: devuelve id/status/providerBookingReference de una reserva propia real", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-booking-getbyid-1",
    });

    const booking = await getBookingById(bookingId, userId);
    assert.ok(booking);
    assert.equal(booking!.id, bookingId);
    assert.equal(booking!.status, "pending");
    assert.equal(booking!.providerBookingReference, "mock-booking-getbyid-1");
  } finally {
    await deleteTestUser(userId);
  }
});

test("getBookingById: providerBookingReference queda undefined (nunca null) cuando la fila no lo tiene", async () => {
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

    const booking = await getBookingById(bookingId, userId);
    assert.ok(booking);
    assert.equal(booking!.providerBookingReference, undefined);
  } finally {
    await deleteTestUser(userId);
  }
});

test("getBookingById: id inexistente devuelve undefined, nunca lanza", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const booking = await getBookingById("00000000-0000-0000-0000-000000000000", userId);
    assert.equal(booking, undefined);
  } finally {
    await deleteTestUser(userId);
  }
});

test("getBookingById: una reserva real de OTRO usuario devuelve undefined (mismo resultado que 'no existe', ownership)", async () => {
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

    const booking = await getBookingById(bookingId, attackerId);
    assert.equal(booking, undefined);
  } finally {
    await deleteTestUser(ownerId);
    await deleteTestUser(attackerId);
  }
});
