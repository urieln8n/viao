import { createServiceRoleClient } from "../supabase/service";

// F6-02 (VIAO_ROADMAP.md) — Persistencia de la reserva en `bookings`
// (VIAO_DATABASE.md sección 6).
//
// RLS/GRANT: `bookings` (Patrón B) no tiene ninguna policy ni GRANT de
// INSERT para `authenticated` — solo `bookings_select_own` (lectura del
// propietario). Verificado empíricamente que `service_role` tampoco tenía
// GRANT alguno (mismo vacío que F5-05 encontró en `analytics_events`);
// corregido en
// supabase/migrations/20260818070000_grant_service_role_bookings_properties.sql
// (SELECT + INSERT únicamente — sin UPDATE/DELETE: la transición
// `pending` → `confirmed`/`cancelled` es F6-03, fuera de alcance aquí).
// A diferencia de `searches` (F5-06, Patrón A, el propio cliente
// autenticado inserta bajo RLS), aquí `service_role` es la ÚNICA vía
// documentada y posible — no una elección de privilegio más amplio.
//
// `rooms` NO se persiste (discrepancia auditada y documentada en el
// reporte de F6-02): `BookingRequest` (types/travel.ts) necesita `rooms`
// para llamar a `TravelProvider.book()` (disponibilidad/precio), pero la
// tabla `bookings` — verificado tanto en VIAO_DATABASE.md sección 6 como
// en el esquema real de Supabase — no tiene columna `rooms`. No se
// inventa una columna nueva ni se fuerza el dato en otro campo: `rooms`
// se usa únicamente donde el modelo lo contempla (la llamada al
// provider, en app/booking/actions.ts), y se omite donde no lo contempla
// (esta fila persistida).
//
// Campos económicos: `booking_value`/`currency` se rellenan con el
// importe que ya devolvió `provider.book()` en este mismo flujo (dato
// real, no inventado) — `provider_commission`/`viao_revenue`/
// `reward_cost` quedan `NULL` (no se llama a `getCommission()`,
// explícitamente fuera de alcance de F6-02).
//
// Sin fila provisional previa a `provider.book()`: esta función solo se
// invoca DESPUÉS de que el provider aceptó la reserva (ver
// app/booking/actions.ts) — el registro en `bookings` representa una
// operación real ya aceptada, nunca una reserva que el provider rechazó.
//
// A diferencia de F5-05/F5-06 (best-effort, nunca bloquean la operación
// principal), esta función SÍ lanza si el insert falla: en ese punto el
// provider ya aceptó la reserva — no persistirla dejaría una reserva real
// sin ningún registro en VIAO, un estado peor que fallar visiblemente. El
// llamador (app/booking/actions.ts) debe capturar el error y devolver un
// resultado controlado, nunca ocultarlo.
export interface CreateBookingRecordInput {
  userId: string;
  propertyRowId: string;
  searchId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  providerBookingReference?: string;
  bookingValue?: number;
  currency?: string;
}

/** Devuelve el `bookings.id` creado. */
export async function createBookingRecord({
  userId,
  propertyRowId,
  searchId,
  checkIn,
  checkOut,
  guests,
  providerBookingReference,
  bookingValue,
  currency,
}: CreateBookingRecordInput): Promise<string> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("bookings")
    .insert({
      user_id: userId,
      property_id: propertyRowId,
      search_id: searchId ?? null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      status: "pending",
      provider_booking_reference: providerBookingReference ?? null,
      booking_value: bookingValue ?? null,
      // `currency` es NOT NULL con DEFAULT 'EUR': se omite la clave (en
      // vez de enviar `null`) cuando el provider no la informó, para que
      // se aplique el default de la columna en lugar de violar NOT NULL.
      ...(currency ? { currency } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo crear la reserva en "bookings": ${error?.message ?? "sin datos"}`,
    );
  }

  return data.id as string;
}
