// FPR-04.12 — Tests de cancel-booking.ts contra Supabase local real
// (getBookingById/updateBookingStatus NUNCA se inyectan falsos: se usan
// siempre los reales, para verificar la persistencia de verdad en cada
// rama). Solo `getProvider` se inyecta falso — nunca se llama a
// Hotelbeds/postHotelbeds real en absoluto.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "./create-booking-record";
import { cancelBooking, type CancelBookingDependencies } from "./cancel-booking";
import { ProviderAmbiguousError, ProviderError, ProviderUnavailableError } from "../travel-provider/errors";
import type { ActiveTravelProvider } from "../travel-provider";
import type { CancellationResult } from "../../types/travel";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `fpr0412-cancel-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
    providerName: "fpr0412_cancel_test_provider",
    providerPropertyId: `fpr0412-cancel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "FPR-04.12 CancelBooking Test Hotel",
  });
}

async function readBookingRow(bookingId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("bookings")
    .select("status, provider_cancellation_reference")
    .eq("id", bookingId)
    .single();
  assert.equal(error, null);
  return data;
}

function fakeProviderWithCancel(
  impl: (request: { providerBookingReference: string }) => Promise<CancellationResult>,
): CancelBookingDependencies {
  return {
    getProvider: () =>
      ({
        cancelBooking: impl,
      }) as unknown as ActiveTravelProvider,
  };
}

// ── not_found ──

test("cancelBooking: bookingId inexistente -> not_found, nunca llama al provider", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    let called = false;
    const result = await cancelBooking(
      { bookingId: "00000000-0000-0000-0000-000000000000", userId },
      fakeProviderWithCancel(async () => {
        called = true;
        return { cancelled: true };
      }),
    );
    assert.deepEqual(result, { outcome: "not_found" });
    assert.equal(called, false);
  } finally {
    await deleteTestUser(userId);
  }
});

test("cancelBooking: reserva real de OTRO usuario -> not_found (mismo resultado que inexistente, ownership)", async () => {
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
      providerBookingReference: "mock-ref-1",
    });

    const result = await cancelBooking(
      { bookingId, userId: attackerId },
      fakeProviderWithCancel(async () => ({ cancelled: true })),
    );
    assert.deepEqual(result, { outcome: "not_found" });
  } finally {
    await deleteTestUser(ownerId);
    await deleteTestUser(attackerId);
  }
});

// ── already_cancelled ──

test("cancelBooking: reserva ya cancelled -> already_cancelled, nunca llama al provider (idempotencia propia)", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-2",
    });
    const service = createServiceRoleClient();
    await service.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);

    let called = false;
    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => {
        called = true;
        return { cancelled: true };
      }),
    );
    assert.deepEqual(result, { outcome: "already_cancelled" });
    assert.equal(called, false, "no debe llamarse al provider dos veces para la misma cancelación");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── missing_provider_reference ──

test("cancelBooking: reserva sin providerBookingReference -> missing_provider_reference, nunca llama al provider", async () => {
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

    let called = false;
    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => {
        called = true;
        return { cancelled: true };
      }),
    );
    assert.deepEqual(result, { outcome: "missing_provider_reference" });
    assert.equal(called, false);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── not_supported ──

test("cancelBooking: provider activo sin cancelBooking() -> not_supported", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-3",
    });

    const result = await cancelBooking(
      { bookingId, userId },
      { getProvider: () => ({}) as unknown as ActiveTravelProvider },
    );
    assert.deepEqual(result, { outcome: "not_supported" });
  } finally {
    await deleteTestUser(userId);
  }
});

// ── éxito ──

test("cancelBooking: éxito -> persiste status=cancelled y provider_cancellation_reference reales", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-4",
    });

    let capturedRef: string | undefined;
    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async (request) => {
        capturedRef = request.providerBookingReference;
        return { cancelled: true, status: "cancelled", cancellationReference: "PPFPPJXXVZ" };
      }),
    );

    assert.deepEqual(result, { outcome: "cancelled", status: "cancelled", cancellationReference: "PPFPPJXXVZ" });
    assert.equal(capturedRef, "mock-ref-4", "debe pasarse el providerBookingReference exacto de la fila");

    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "cancelled");
    assert.equal(row.provider_cancellation_reference, "PPFPPJXXVZ");
  } finally {
    await deleteTestUser(userId);
  }
});

test("cancelBooking: éxito sin status devuelto por el provider -> usa 'cancelled' por defecto", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-5",
    });

    // Mismo comportamiento que MockHotelProvider.cancelBooking(): solo {cancelled: true}, sin status/cancellationReference.
    const result = await cancelBooking({ bookingId, userId }, fakeProviderWithCancel(async () => ({ cancelled: true })));

    assert.deepEqual(result, { outcome: "cancelled", status: "cancelled", cancellationReference: undefined });
    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "cancelled");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── not_cancelled_by_provider: el provider respondió pero el status real no es cancelled ──

test("cancelBooking: provider responde cancelled=false -> not_cancelled_by_provider, bookings.status NUNCA se toca", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-6",
    });

    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => ({ cancelled: false, status: "confirmed" })),
    );

    assert.deepEqual(result, { outcome: "not_cancelled_by_provider", status: "confirmed" });
    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "pending", "el status original de la fila no debe alterarse");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── ambiguous: regla crítica, bookings.status NUNCA se toca ──

test("cancelBooking: ProviderAmbiguousError -> outcome ambiguous, bookings.status NUNCA se marca cancelled (Hotelbeds pudo cancelar igualmente)", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-7",
    });
    const service = createServiceRoleClient();
    await service.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);

    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => {
        throw new ProviderAmbiguousError("Error de red al llamar a DELETE /bookings — no se puede confirmar.");
      }),
    );

    assert.equal(result.outcome, "ambiguous");
    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "confirmed", "nunca debe marcarse cancelled ni ningún otro estado ante una ambigüedad");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── rechazo claro / error técnico: tampoco tocan bookings.status ──

test("cancelBooking: ProviderUnavailableError -> outcome provider_unavailable, bookings.status intacto", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "does-not-exist-at-provider",
    });

    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => {
        throw new ProviderUnavailableError("La reserva no existe.");
      }),
    );

    assert.equal(result.outcome, "provider_unavailable");
    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

test("cancelBooking: ProviderError -> outcome provider_error, bookings.status intacto", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-8",
    });

    const result = await cancelBooking(
      { bookingId, userId },
      fakeProviderWithCancel(async () => {
        throw new ProviderError("Hotelbeds devolvió un error HTTP 500 al cancelar.");
      }),
    );

    assert.equal(result.outcome, "provider_error");
    const row = await readBookingRow(bookingId);
    assert.equal(row.status, "pending");
  } finally {
    await deleteTestUser(userId);
  }
});

test("cancelBooking: un error inesperado (no TravelProviderError) se relanza, nunca se oculta", async () => {
  const { userId } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();
  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      providerBookingReference: "mock-ref-9",
    });

    await assert.rejects(
      () =>
        cancelBooking(
          { bookingId, userId },
          fakeProviderWithCancel(async () => {
            throw new TypeError("bug inesperado, no relacionado con el modelo de errores de F4-03");
          }),
        ),
      TypeError,
    );
  } finally {
    await deleteTestUser(userId);
  }
});
