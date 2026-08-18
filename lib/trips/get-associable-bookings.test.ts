// F11-02 (VIAO_ROADMAP.md) — Tests de la lista de reservas asociables,
// contra Supabase local real. Mismo motivo que el resto del proyecto
// para no depender de `next/headers` en la función en sí: solo se
// ejercita el camino "fuera de una petición real de Next.js"; el
// filtrado real por RLS (`bookings_select_own`) ya se prueba en
// lib/bookings/associate-trip.test.ts y aquí se reconfirma directamente.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "../bookings/create-booking-record";
import { getAssociableBookings } from "./get-associable-bookings";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1102b-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1102b-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("getAssociableBookings(): fuera de una petición real de Next.js devuelve lista vacía, no lanza", async () => {
  const result = await getAssociableBookings();
  assert.deepEqual(result, []);
});

test("RLS: un usuario autenticado solo ve sus propias reservas, nunca las de otro (bookings_select_own)", async () => {
  const owner = await signUpUser();
  const other = await signUpUser();
  try {
    const propertyRowId = await upsertPropertyCache({
      providerName: "f1102b_test_provider",
      providerPropertyId: `f1102b-${Date.now()}`,
      name: "F11-02 Test Hotel",
    });
    await createBookingRecord({
      userId: owner.userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: `mock-f1102b-${Date.now()}`,
    });

    const { data: ownRows } = await owner.authedClient.from("bookings").select("id");
    assert.equal(ownRows?.length, 1);

    const { data: otherRows } = await other.authedClient.from("bookings").select("id");
    assert.equal(otherRows?.length, 0, "el usuario ajeno no debe ver ninguna reserva del propietario");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});
