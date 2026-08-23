// FPR-04.9 — Test de integración: createBookingAction (flujo con booking
// intent como ancla de idempotencia) -> HotelbedsProvider.book() ->
// persistencia -> transiciones de intent, contra Supabase local real.
// `book` es una función FALSA controlable (nunca Hotelbeds real ni
// postHotelbeds) — reproduce exactamente la lógica de orquestación de
// app/booking/actions.ts (ver runIntentAwareBookingFlow,
// lib/integration/test-helpers.ts) porque esa Server Action depende de
// `next/headers` y no es invocable directamente fuera de una petición
// real (misma limitación que search-to-booking.test.ts, F14-03).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  signUpIntegrationUser,
  deleteIntegrationUser,
  runIntentAwareBookingFlow,
} from "./test-helpers";
import { createServiceRoleClient } from "../supabase/service";
import { ProviderAmbiguousError, ProviderError, ProviderUnavailableError } from "../travel-provider/errors";
import type { BookingRequest, BookingResult } from "../../types/travel";

const STAY = {
  providerName: "hotelbeds",
  providerPropertyId: "fpr049-test-hotel",
  checkIn: "2026-12-01",
  checkOut: "2026-12-04",
  guests: 2,
  rooms: 1,
};

async function getIntentRow(intentId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("booking_intents")
    .select("id, status, client_reference, booking_id")
    .eq("id", intentId)
    .single();
  assert.equal(error, null);
  assert.ok(data);
  return data;
}

// ── 1. Reserva CONFIRMED ──
test("FPR-04.9.1: reserva CONFIRMED -> intent completed, booking creado con status confirmed y booking_id asociado", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-confirmed");
  try {
    const fakeBook = async (): Promise<BookingResult> => ({
      status: "confirmed",
      providerBookingReference: "HB-REF-1",
      amount: 250,
      currency: "EUR",
    });

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });

    assert.equal(result.outcome, "success");
    if (result.outcome !== "success") return;
    assert.equal(result.bookingResult.status, "confirmed");

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "completed");
    assert.equal(intentRow.booking_id, result.bookingId);

    const service = createServiceRoleClient();
    const { data: bookingRow } = await service.from("bookings").select("status, provider_booking_reference").eq("id", result.bookingId).single();
    assert.ok(bookingRow);
    assert.equal(bookingRow.status, "confirmed");
    assert.equal(bookingRow.provider_booking_reference, "HB-REF-1");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 2. Reserva PRECONFIRMED ──
test("FPR-04.9.2: reserva PRECONFIRMED -> booking.status=pending, intent.status=completed", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-preconfirmed");
  try {
    const fakeBook = async (): Promise<BookingResult> => ({
      status: "pending",
      providerBookingReference: "HB-REF-2",
      amount: 100,
      currency: "EUR",
    });

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });

    assert.equal(result.outcome, "success");
    if (result.outcome !== "success") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "completed");

    const service = createServiceRoleClient();
    const { data: bookingRow } = await service.from("bookings").select("status").eq("id", result.bookingId).single();
    assert.equal(bookingRow?.status, "pending");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 3. Duplicate concurrent: Hotelbeds.book() se llama solo para el ganador ──
test("FPR-04.9.3: dos requests concurrentes (misma tupla) -> 1 intent_created, 1 duplicate_booking_intent, book() se llama EXACTAMENTE una vez", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-concurrent");
  try {
    let bookCallCount = 0;
    const fakeBook = async (): Promise<BookingResult> => {
      bookCallCount += 1;
      return { status: "confirmed", providerBookingReference: "HB-REF-3", amount: 150, currency: "EUR" };
    };

    const [a, b] = await Promise.all([
      runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook }),
      runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook }),
    ]);

    const outcomes = [a.outcome, b.outcome].sort();
    assert.deepEqual(outcomes, ["duplicate_booking_intent", "success"]);
    assert.equal(bookCallCount, 1, "book() nunca debe llamarse más de una vez para la misma tupla concurrente");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 4/5. Error previo a /bookings (Availability/CheckRates) -> failed, sin fila en bookings ──
test("FPR-04.9.4: fallo de Availability (ProviderError, previo a /bookings) -> intent failed, ninguna fila en bookings", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-availability-error");
  try {
    const fakeBook = async (): Promise<BookingResult> => {
      throw new ProviderError("Availability falló: credenciales no disponibles.");
    };

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(result.outcome, "failed");
    if (result.outcome !== "failed") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "failed");

    const service = createServiceRoleClient();
    const { data: bookings } = await service.from("bookings").select("id").eq("user_id", userId);
    assert.equal((bookings ?? []).length, 0);
  } finally {
    await deleteIntegrationUser(userId);
  }
});

test("FPR-04.9.5: fallo de CheckRates (ProviderError, previo a /bookings) -> intent failed, ninguna fila en bookings", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-checkrate-error");
  try {
    const fakeBook = async (): Promise<BookingResult> => {
      throw new ProviderError("CheckRates devolvió un error HTTP 500 al resolver la tarifa.");
    };

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(result.outcome, "failed");
    if (result.outcome !== "failed") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "failed");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 6. Booking rechazado claramente (Hotelbeds respondió, http_error) -> failed, sin fila ──
test("FPR-04.9.6: booking rechazado claramente (ProviderUnavailableError) -> intent failed, ninguna fila en bookings", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-rejected");
  try {
    const fakeBook = async (): Promise<BookingResult> => {
      throw new ProviderUnavailableError("Hotelbeds rechazó la reserva: sin disponibilidad.");
    };

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(result.outcome, "failed");
    if (result.outcome !== "failed") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "failed");

    const service = createServiceRoleClient();
    const { data: bookings } = await service.from("bookings").select("id").eq("user_id", userId);
    assert.equal((bookings ?? []).length, 0);
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 7. Timeout DESPUÉS de POST /bookings -> intent permanece in_progress, NUNCA failed, NUNCA un segundo book() ──
test("FPR-04.9.7: timeout/error de red tras enviar /bookings (ProviderAmbiguousError) -> intent permanece in_progress", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-ambiguous");
  try {
    let bookCallCount = 0;
    const fakeBook = async (): Promise<BookingResult> => {
      bookCallCount += 1;
      throw new ProviderAmbiguousError("Error de red al llamar a POST /bookings — no se puede confirmar si Hotelbeds procesó la reserva.");
    };

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(result.outcome, "pending_confirmation");
    if (result.outcome !== "pending_confirmation") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "in_progress", "nunca debe marcarse failed ante una ambigüedad — Hotelbeds podría haber confirmado igualmente");
    assert.equal(bookCallCount, 1, "nunca debe reintentarse automáticamente book() tras una ambigüedad");

    const service = createServiceRoleClient();
    const { data: bookings } = await service.from("bookings").select("id").eq("user_id", userId);
    assert.equal((bookings ?? []).length, 0);
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 8. Provider CONFIRMED + Supabase falla -> provider_confirmed_orphaned, nunca failed, referencia conservada ──
test("FPR-04.9.8: provider CONFIRMED pero la persistencia en Supabase falla -> intent provider_confirmed_orphaned, nunca failed", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-orphaned");
  try {
    const fakeBook = async (): Promise<BookingResult> => ({
      status: "confirmed",
      providerBookingReference: "HB-REF-ORPHAN",
      amount: 300,
      currency: "EUR",
    });

    const result = await runIntentAwareBookingFlow({
      userId,
      ...STAY,
      book: fakeBook,
      simulatePersistenceFailure: true,
    });

    assert.equal(result.outcome, "persistence_error");
    if (result.outcome !== "persistence_error") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.equal(intentRow.status, "provider_confirmed_orphaned");
    assert.notEqual(intentRow.status, "failed");

    const service = createServiceRoleClient();
    const { data: bookings } = await service.from("bookings").select("id").eq("user_id", userId);
    assert.equal((bookings ?? []).length, 0, "la fila de bookings nunca llegó a crearse (ese es precisamente el fallo simulado)");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 9. Client reference: exactamente el mismo valor que booking_intents.client_reference ──
test("FPR-04.9.9: el clientReference recibido por book() es EXACTAMENTE booking_intents.client_reference, nunca regenerado", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-clientref");
  try {
    let capturedClientReference: string | undefined;
    const fakeBook = async (_request: BookingRequest, clientReference?: string): Promise<BookingResult> => {
      capturedClientReference = clientReference;
      return { status: "confirmed", providerBookingReference: "HB-REF-4", amount: 120, currency: "EUR" };
    };

    const result = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(result.outcome, "success");
    if (result.outcome !== "success") return;

    const intentRow = await getIntentRow(result.intentId);
    assert.ok(capturedClientReference);
    assert.equal(capturedClientReference, intentRow.client_reference);
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 10. Misma tupla después de completed: puede crearse una nueva intención ──
test("FPR-04.9.10: tras un intent completed, la misma tupla puede crear un nuevo intent (no bloquea reintentos futuros legítimos)", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-retry-after-completed");
  try {
    const fakeBook = async (): Promise<BookingResult> => ({
      status: "confirmed",
      providerBookingReference: "HB-REF-5",
      amount: 90,
      currency: "EUR",
    });

    const first = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(first.outcome, "success");

    const second = await runIntentAwareBookingFlow({ userId, ...STAY, book: fakeBook });
    assert.equal(second.outcome, "success", "un intent completed no debe bloquear una nueva reserva legítima de la misma tupla");
    if (first.outcome !== "success" || second.outcome !== "success") return;
    assert.notEqual(first.intentId, second.intentId);
  } finally {
    await deleteIntegrationUser(userId);
  }
});

// ── 11. Misma tupla después de failed: puede crearse una nueva intención ──
test("FPR-04.9.11: tras un intent failed, la misma tupla puede crear un nuevo intent (reintento legítimo tras un rechazo)", async () => {
  const { userId } = await signUpIntegrationUser("fpr049-retry-after-failed");
  try {
    const rejectingBook = async (): Promise<BookingResult> => {
      throw new ProviderUnavailableError("sin disponibilidad");
    };
    const confirmingBook = async (): Promise<BookingResult> => ({
      status: "confirmed",
      providerBookingReference: "HB-REF-6",
      amount: 90,
      currency: "EUR",
    });

    const first = await runIntentAwareBookingFlow({ userId, ...STAY, book: rejectingBook });
    assert.equal(first.outcome, "failed");

    const second = await runIntentAwareBookingFlow({ userId, ...STAY, book: confirmingBook });
    assert.equal(second.outcome, "success", "un intent failed no debe bloquear un reintento legítimo de la misma tupla");
    if (first.outcome !== "failed" || second.outcome !== "success") return;
    assert.notEqual(first.intentId, second.intentId);
  } finally {
    await deleteIntegrationUser(userId);
  }
});
