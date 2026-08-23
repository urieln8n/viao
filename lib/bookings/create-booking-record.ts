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
// `rooms` (FPR-04.10 — resuelve la discrepancia documentada desde F6-02:
// se usaba para llamar a `TravelProvider.book()` pero nunca se persistía
// porque la columna no existía; migración
// 20260823130000_add_booking_persistence_fields.sql la añade, nullable,
// sin tocar filas ya existentes).
//
// Campos económicos (FPR-04.3/FPR-04.10): `booking_value`/`currency` son
// el precio de VIAO (`amount`); `provider_cost` es el coste real del
// proveedor (`totalNet` de Hotelbeds, `BookingResult.providerCost`) —
// mientras no exista una decisión de markup, ambos llegan con el MISMO
// valor desde `app/booking/actions.ts` (`amount === providerCost`, ver
// lib/hotelbeds/booking.ts), pero son columnas separadas a propósito, no
// se colapsan en una sola. `provider_commission`/`viao_revenue`/
// `reward_cost` siguen `NULL` (no se llama a `getCommission()`,
// explícitamente fuera de alcance).
//
// `provider_cancellation_reference` (FPR-04.10): mismo criterio que
// `provider_booking_reference` — dato real devuelto por el proveedor
// (`BookingResult.providerCancellationReference`), nunca inventado;
// `NULL` cuando el proveedor no lo informa (Hotelbeds solo lo expone en
// ciertos estados/tarifas, ver lib/hotelbeds/booking.ts).
//
// `holder_name`/`holder_surname` (FPR-04.10): vienen de
// `BookingRequest.holder` — hoy siempre `undefined` en el flujo real
// porque `app/booking/actions.ts` todavía no recoge el titular desde la
// UI (fuera de alcance de este bloque); quedan `NULL` hasta que ese dato
// exista de verdad, nunca un valor de relleno.
//
// Nunca se persiste: `paymentData`/tarjeta/CVV (no existen en
// `BookingRequest`/`BookingResult`, ver types/travel.ts), `rateKey`
// (detalle interno de Hotelbeds, nunca sale de hotelbeds-provider.ts) ni
// `clientReference` (pertenece a `booking_intents`, es un identificador
// de idempotencia/proceso, no un dato de negocio de la reserva).
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
  rooms?: number;
  providerBookingReference?: string;
  providerCancellationReference?: string;
  bookingValue?: number;
  providerCost?: number;
  currency?: string;
  holderName?: string;
  holderSurname?: string;
}

/** Devuelve el `bookings.id` creado. */
export async function createBookingRecord({
  userId,
  propertyRowId,
  searchId,
  checkIn,
  checkOut,
  guests,
  rooms,
  providerBookingReference,
  providerCancellationReference,
  bookingValue,
  providerCost,
  currency,
  holderName,
  holderSurname,
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
      rooms: rooms ?? null,
      status: "pending",
      provider_booking_reference: providerBookingReference ?? null,
      provider_cancellation_reference: providerCancellationReference ?? null,
      booking_value: bookingValue ?? null,
      provider_cost: providerCost ?? null,
      holder_name: holderName ?? null,
      holder_surname: holderSurname ?? null,
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
