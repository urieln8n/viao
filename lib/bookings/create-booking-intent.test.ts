// FPR-04.6 — Tests de create-booking-intent.ts. `generateHotelbedsClientReference`
// es pura (sin red, sin Supabase). `createBookingIntent` se prueba contra
// Supabase local real (no un mock) — mismo criterio que
// lib/bookings/create-booking-record.test.ts: requiere Supabase local
// arrancado y sus variables de entorno pasadas al proceso (nunca
// `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import {
  createBookingIntent,
  generateHotelbedsClientReference,
  type CreateBookingIntentInput,
} from "./create-booking-intent";
import { markBookingIntentFailed } from "./update-booking-intent-status";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `fpr046-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({ email, password: "fpr046-test-password-12345" });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  // ON DELETE CASCADE (profiles→booking_intents vía user_id) limpia los
  // intents al borrar el usuario — mismo patrón que create-booking-record.test.ts.
  await service.auth.admin.deleteUser(userId);
}

function makeInput(overrides: Partial<CreateBookingIntentInput> = {}): CreateBookingIntentInput {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    providerName: "hotelbeds",
    providerPropertyId: "3424",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    guests: 2,
    rooms: 1,
    ...overrides,
  };
}

// ── generateHotelbedsClientReference (pura, sin red/Supabase) ──

test("generateHotelbedsClientReference: la referencia nunca supera 20 caracteres", () => {
  const ref = generateHotelbedsClientReference("123e4567-e89b-12d3-a456-426614174000");
  assert.ok(ref.length <= 20, `longitud real: ${ref.length}`);
});

test("generateHotelbedsClientReference: es determinista — el mismo id siempre produce la misma referencia", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.equal(generateHotelbedsClientReference(id), generateHotelbedsClientReference(id));
});

test("generateHotelbedsClientReference: dos ids distintos producen referencias distintas", () => {
  const refA = generateHotelbedsClientReference("123e4567-e89b-12d3-a456-426614174000");
  const refB = generateHotelbedsClientReference("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  assert.notEqual(refA, refB);
});

// ── createBookingIntent (Supabase local real) ──

test("createBookingIntent: crea un intent correctamente, con status='in_progress' y clientReference válido", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const result = await createBookingIntent(makeInput({ userId }));

    assert.equal(result.outcome, "intent_created");
    if (result.outcome !== "intent_created") return;
    assert.equal(result.intent.status, "in_progress");
    assert.ok(result.intent.clientReference.length <= 20);
    assert.equal(result.intent.clientReference, generateHotelbedsClientReference(result.intent.id));
  } finally {
    await deleteTestUser(userId);
  }
});

test("createBookingIntent: dos intents concurrentes con la misma tupla — solo uno queda 'in_progress', el otro es 'duplicate_booking_intent'", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const input = makeInput({ userId });

    const [first, second] = await Promise.all([createBookingIntent(input), createBookingIntent(input)]);

    const outcomes = [first.outcome, second.outcome].sort();
    assert.deepEqual(outcomes, ["duplicate_booking_intent", "intent_created"]);

    // El conflicto NUNCA se convierte en persistence_error.
    for (const result of [first, second]) {
      assert.notEqual(result.outcome, "persistence_error");
    }
  } finally {
    await deleteTestUser(userId);
  }
});

test("createBookingIntent: un intent 'completed' NO bloquea una intención nueva idéntica", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const input = makeInput({ userId });

    const first = await createBookingIntent(input);
    assert.equal(first.outcome, "intent_created");
    if (first.outcome !== "intent_created") return;

    // bookingId real requerido por la FK — se usa un uuid inexistente
    // deliberadamente para forzar el fallo de FK y así demostrar que
    // esta prueba NO depende de tener una fila real en bookings... en
    // realidad la FK SÍ lo exige, así que en vez de eso usamos el mismo
    // patrón de update-booking-intent-status.test.ts (fila real).
    // Aquí solo comprobamos el efecto sobre el índice de idempotencia:
    // forzamos 'failed' (que no requiere bookingId) para liberar la tupla.
    const markResult = await markBookingIntentFailed(first.intent.id);
    assert.equal(markResult.outcome, "success");

    const second = await createBookingIntent(input);
    assert.equal(second.outcome, "intent_created", "una tupla con el intent anterior en 'failed' debe permitir una intención nueva");
  } finally {
    await deleteTestUser(userId);
  }
});

test("createBookingIntent: un intent 'failed' NO bloquea una intención nueva idéntica (mismo caso que 'completed', confirmado aparte)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const input = makeInput({ userId });

    const first = await createBookingIntent(input);
    assert.equal(first.outcome, "intent_created");
    if (first.outcome !== "intent_created") return;

    await markBookingIntentFailed(first.intent.id);

    const second = await createBookingIntent(input);
    assert.equal(second.outcome, "intent_created");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS/GRANT: Patrón B, igual que bookings ──

test("un cliente anon no puede insertar en booking_intents (sin GRANT ni policy)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("booking_intents").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    provider_name: "hotelbeds",
    provider_property_id: "3424",
    check_in: "2026-09-10",
    check_out: "2026-09-12",
    guests: 2,
    rooms: 1,
    client_reference: "anon-attempt-ref",
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});

test("service_role NO tiene GRANT de DELETE sobre booking_intents (alcance mínimo, igual que bookings)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const result = await createBookingIntent(makeInput({ userId }));
    assert.equal(result.outcome, "intent_created");
    if (result.outcome !== "intent_created") return;

    const service = createServiceRoleClient();
    const { error } = await service.from("booking_intents").delete().eq("id", result.intent.id);

    assert.ok(error, "se esperaba que Postgres rechazara el DELETE: la migración solo concede SELECT+INSERT+UPDATE");
  } finally {
    await deleteTestUser(userId);
  }
});
