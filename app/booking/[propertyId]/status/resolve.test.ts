// F6-05 (VIAO_ROADMAP.md) — Tests de la resolución de la pantalla de
// estado de una reserva.
//
// `resolveBookingStatus()` depende de `next/headers` (a través de
// `createSessionClient()`), así que solo su contrato de "fuera de una
// petición real -> unauthenticated, nunca lanza" y la validación de
// formato de UUID son ejercitables invocándola directamente aquí — misma
// limitación ya documentada en get-search-by-id.test.ts (F6-01) y
// actions.test.ts (F6-02/F6-03). El resto de la cobertura obligatoria
// (ownership real vía RLS, relación con properties, campos económicos)
// se ejercita con un cliente `@supabase/supabase-js` autenticado real
// realizando EXACTAMENTE la misma consulta que resolve.ts (select +
// embed de properties + `.maybeSingle()`), tal como F6-02/F6-03 ya
// hicieron para probar RLS de escritura sin sustituir el comportamiento
// real de Supabase por mocks.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { upsertPropertyCache } from "../../../../lib/properties/upsert-property-cache";
import { createBookingRecord } from "../../../../lib/bookings/create-booking-record";
import { updateBookingStatus } from "../../../../lib/bookings/update-booking-status";
import { resolveBookingStatus, isBookingStatus } from "./resolve";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f605-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f605-test-password-12345",
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
    providerName: "f605_test_provider",
    providerPropertyId: `f605-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "F6-05 Status Test Hotel",
    city: "Madrid",
    country: "España",
    rating: 4.3,
    mainPhotoUrl: "https://example.test/f605.jpg",
  });
}

// Misma forma exacta de consulta que app/booking/[propertyId]/status/resolve.ts,
// incluida la aserción de tipo sobre el embed de `properties` (supabase-js
// lo infiere como array sin `Database<>`, ver la nota equivalente en
// resolve.ts).
interface RawBookingRow {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  guests: number;
  provider_booking_reference: string | null;
  booking_value: number | string | null;
  currency: string;
  search_id: string | null;
  property: {
    name: string;
    city: string | null;
    country: string | null;
    main_photo_url: string | null;
    rating: number | string | null;
    provider_property_id: string;
  } | null;
}

async function selectBookingStatusAs(client: SupabaseClient, bookingId: string) {
  const result = await client
    .from("bookings")
    .select(
      "id, status, check_in, check_out, guests, provider_booking_reference, booking_value, currency, search_id, property:properties(name, city, country, main_photo_url, rating, provider_property_id)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  return { data: result.data as unknown as RawBookingRow | null, error: result.error };
}

test("resolveBookingStatus: fuera de una petición real de Next.js -> unauthenticated, no lanza", async () => {
  const result = await resolveBookingStatus("00000000-0000-0000-0000-000000000000");
  assert.equal(result.status, "unauthenticated");
});

test("resolveBookingStatus: id con formato inválido -> not_found sin necesidad de sesión ni consulta", async () => {
  const result = await resolveBookingStatus("no-es-un-uuid");
  assert.equal(result.status, "not_found");
});

// ── 10. Estado inesperado/no soportado ──
test("isBookingStatus: acepta exactamente pending/confirmed/cancelled y rechaza cualquier otro valor, sin lanzar", () => {
  assert.equal(isBookingStatus("pending"), true);
  assert.equal(isBookingStatus("confirmed"), true);
  assert.equal(isBookingStatus("cancelled"), true);
  assert.equal(isBookingStatus("refunded"), false);
  assert.equal(isBookingStatus(""), false);
  assert.equal(isBookingStatus(null), false);
  assert.equal(isBookingStatus(undefined), false);
  assert.equal(isBookingStatus(42), false);
});

// ── 1. Reserva propia pending, 7. property relacionada, 8. reference, 9. value/currency ──
test("un usuario autenticado puede leer su propia reserva pending, con la property y los campos económicos correctos", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      guests: 2,
      providerBookingReference: "mock-booking-f605-1",
      bookingValue: 180,
      currency: "EUR",
    });

    const { data, error } = await selectBookingStatusAs(authedClient, bookingId);
    assert.equal(error, null);
    assert.ok(data);
    assert.ok(data.property);
    assert.equal(data.status, "pending");
    assert.equal(data.property.name, "F6-05 Status Test Hotel");
    assert.equal(data.property.city, "Madrid");
    assert.equal(data.property.country, "España");
    assert.equal(data.provider_booking_reference, "mock-booking-f605-1");
    assert.equal(Number(data.booking_value), 180);
    assert.equal(data.currency, "EUR");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 2. Reserva propia confirmed (tras la transición real de F6-03) ──
test("un usuario autenticado puede leer su propia reserva confirmed tras updateBookingStatus (F6-03)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-12-05",
      checkOut: "2026-12-07",
      guests: 1,
    });
    await updateBookingStatus({ bookingId, userId, status: "confirmed" });

    const { data, error } = await selectBookingStatusAs(authedClient, bookingId);
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.status, "confirmed");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 3. Reserva propia cancelled — ningún flujo de producto la genera hoy
// (ni F6-02 ni F6-03: provider.book() del mock nunca devuelve "cancelled",
// ver auditoría de F6-03). Se crea con service_role EXCLUSIVAMENTE como
// dato de prueba para verificar esta representación, mismo criterio que
// el enunciado de F6-05 autoriza explícitamente para el E2E. ──
test("un usuario autenticado puede leer su propia reserva cancelled (dato de prueba vía service_role)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId,
      propertyRowId,
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      guests: 1,
    });
    const service = createServiceRoleClient();
    const { error: updateError } = await service
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    assert.equal(updateError, null);

    const { data, error } = await selectBookingStatusAs(authedClient, bookingId);
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.status, "cancelled");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 4. Reserva inexistente ──
test("un UUID bien formado pero inexistente no devuelve ninguna fila (ni error)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();

  try {
    const { data, error } = await selectBookingStatusAs(
      authedClient,
      "00000000-0000-0000-0000-000000000000",
    );
    assert.equal(error, null);
    assert.equal(data, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 5. Reserva de otro usuario (ownership) ──
test("RLS (bookings_select_own): un usuario NO puede leer la reserva de otro usuario cambiando el UUID", async () => {
  const { userId: ownerId } = await createConfirmedTestUser();
  const { userId: attackerId, authedClient: attackerClient } = await createConfirmedTestUser();
  const propertyRowId = await createTestPropertyRow();

  try {
    const bookingId = await createBookingRecord({
      userId: ownerId,
      propertyRowId,
      checkIn: "2026-12-15",
      checkOut: "2026-12-17",
      guests: 1,
    });

    const { data, error } = await selectBookingStatusAs(attackerClient, bookingId);
    assert.equal(error, null);
    assert.equal(
      data,
      null,
      "RLS debe impedir por completo ver la fila ajena, no solo ocultar algunos campos",
    );
  } finally {
    await deleteTestUser(ownerId);
    await deleteTestUser(attackerId);
  }
});

// ── 6. Usuario no autenticado (a nivel de Postgres, sin GRANT/policy para anon) ──
test("RLS/GRANT: un cliente anon no puede leer bookings en absoluto", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await selectBookingStatusAs(
    anonClient,
    "00000000-0000-0000-0000-000000000000",
  );
  assert.ok(error, "se esperaba que Postgres rechazara el SELECT para el rol anon (sin GRANT)");
});
