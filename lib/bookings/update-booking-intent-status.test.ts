// FPR-04.6 — Tests de update-booking-intent-status.ts contra Supabase
// local real (no un mock) — mismo criterio que
// lib/bookings/update-booking-status.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createBookingIntent } from "./create-booking-intent";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";
import {
  markBookingIntentCompleted,
  markBookingIntentFailed,
  markBookingIntentProviderConfirmedOrphaned,
} from "./update-booking-intent-status";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `fpr046-status-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({ email, password: "fpr046-test-password-12345" });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createIntent(userId: string, overrides: Partial<Parameters<typeof createBookingIntent>[0]> = {}) {
  const result = await createBookingIntent({
    userId,
    providerName: "hotelbeds",
    providerPropertyId: "3424",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    guests: 2,
    rooms: 1,
    ...overrides,
  });
  assert.equal(result.outcome, "intent_created");
  if (result.outcome !== "intent_created") throw new Error("no se pudo crear el intent de prueba");
  return result.intent;
}

async function createRealBookingRow(userId: string): Promise<string> {
  const propertyRowId = await upsertPropertyCache({
    providerName: "hotelbeds",
    providerPropertyId: `fpr046-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "FPR-04.6 Test Hotel",
  });
  return createBookingRecord({
    userId,
    propertyRowId,
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    guests: 2,
  });
}

// ── in_progress -> completed ──

test("markBookingIntentCompleted: in_progress -> completed, asocia booking_id correctamente", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const intent = await createIntent(userId);
    const bookingId = await createRealBookingRow(userId);

    const result = await markBookingIntentCompleted(intent.id, bookingId);
    assert.equal(result.outcome, "success");

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("booking_intents")
      .select("status, booking_id")
      .eq("id", intent.id)
      .single();
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.status, "completed");
    assert.equal(data.booking_id, bookingId);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── in_progress -> failed ──

test("markBookingIntentFailed: in_progress -> failed", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const intent = await createIntent(userId);

    const result = await markBookingIntentFailed(intent.id);
    assert.equal(result.outcome, "success");

    const service = createServiceRoleClient();
    const { data } = await service.from("booking_intents").select("status").eq("id", intent.id).single();
    assert.ok(data);
    assert.equal(data.status, "failed");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── in_progress -> provider_confirmed_orphaned ──

test("markBookingIntentProviderConfirmedOrphaned: in_progress -> provider_confirmed_orphaned", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const intent = await createIntent(userId);

    const result = await markBookingIntentProviderConfirmedOrphaned(intent.id);
    assert.equal(result.outcome, "success");

    const service = createServiceRoleClient();
    const { data } = await service.from("booking_intents").select("status").eq("id", intent.id).single();
    assert.ok(data);
    assert.equal(data.status, "provider_confirmed_orphaned");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── transiciones arbitrarias: nunca se permite re-transicionar un intent ya resuelto ──

test("un intent ya 'completed' no puede volver a transicionar (no_matching_in_progress_intent, nunca success)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const intent = await createIntent(userId);
    const bookingId = await createRealBookingRow(userId);

    const first = await markBookingIntentCompleted(intent.id, bookingId);
    assert.equal(first.outcome, "success");

    const second = await markBookingIntentFailed(intent.id);
    assert.equal(second.outcome, "no_matching_in_progress_intent");

    // El estado real sigue siendo 'completed', nunca se sobrescribió a 'failed'.
    const service = createServiceRoleClient();
    const { data } = await service.from("booking_intents").select("status").eq("id", intent.id).single();
    assert.ok(data);
    assert.equal(data.status, "completed");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un id de intent inexistente devuelve no_matching_in_progress_intent, nunca un error genérico", async () => {
  const result = await markBookingIntentFailed("00000000-0000-0000-0000-000000000000");
  assert.equal(result.outcome, "no_matching_in_progress_intent");
});

// FPR-04.7.1 — mismo caso que "completed no puede volver a transicionar",
// pero en la dirección opuesta (failed -> completed), para confirmar que
// la corrección de PGRST116 no depende de qué transición se intente.
test("un intent ya 'failed' no puede pasar a 'completed' (no_matching_in_progress_intent, nunca success ni persistence_error)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const intent = await createIntent(userId);

    const first = await markBookingIntentFailed(intent.id);
    assert.equal(first.outcome, "success");

    const bookingId = await createRealBookingRow(userId);
    const second = await markBookingIntentCompleted(intent.id, bookingId);
    assert.equal(second.outcome, "no_matching_in_progress_intent");

    const service = createServiceRoleClient();
    const { data } = await service.from("booking_intents").select("status, booking_id").eq("id", intent.id).single();
    assert.ok(data);
    assert.equal(data.status, "failed");
    assert.equal(data.booking_id, null, "un intento fallido de completar no debe dejar booking_id asociado");
  } finally {
    await deleteTestUser(userId);
  }
});

// FPR-04.7.1 — un error REAL de Supabase (no "0 filas") debe seguir
// siendo persistence_error, nunca reclasificarse como
// no_matching_in_progress_intent solo porque hubo un error. Se fuerza un
// error real y distinto de PGRST116 con un id que no es un uuid válido
// (Postgres lo rechaza con un error de tipo, no con "0 filas").
test("un error real de Supabase (no PGRST116) sigue devolviendo persistence_error", async () => {
  const result = await markBookingIntentFailed("esto-no-es-un-uuid-valido");

  assert.equal(result.outcome, "persistence_error");
  if (result.outcome === "persistence_error") {
    assert.ok(result.message.length > 0);
  }
});
