import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "../supabase/service";

// FPR-04.6 — Creación de la "intención de reserva" (idempotencia real a
// nivel Postgres, diseño cerrado en FPR-04.3). Contraparte de escritura
// de `lib/bookings/update-booking-intent-status.ts` (transiciones de
// estado) — mismo patrón exacto ya usado para `bookings`
// (create-booking-record.ts / update-booking-status.ts, dos archivos
// separados).
//
// El INSERT es la ÚNICA operación atómica que decide quién obtiene el
// "lock": nunca se hace un SELECT previo para comprobar si ya existe un
// intent en curso — el índice único parcial
// `booking_intents_dedup` (migración 20260820120000, solo mientras
// `status='in_progress'`) es quien decide, de forma atómica, si esta
// tupla (usuario+alojamiento+fechas+ocupación) ya tiene una intención en
// curso. Dos requests concurrentes con la misma tupla: Postgres solo
// deja pasar UNO de los dos INSERT; el otro falla con el código real
// `23505` (unique_violation), que este módulo traduce a
// `duplicate_booking_intent` — nunca a un error genérico.
export type BookingIntentStatus =
  | "in_progress"
  | "completed"
  | "failed"
  | "provider_confirmed_orphaned";

export interface BookingIntent {
  id: string;
  clientReference: string;
  status: BookingIntentStatus;
}

export interface CreateBookingIntentInput {
  userId: string;
  providerName: string;
  providerPropertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export type CreateBookingIntentResult =
  | { outcome: "intent_created"; intent: BookingIntent }
  | { outcome: "duplicate_booking_intent" }
  | { outcome: "persistence_error"; message: string };

/**
 * `clientReference` de Hotelbeds — límite real confirmado en FPR-04
 * (`maxLength: 20` en el spec oficial de Booking API). Determinista a
 * partir del propio `intentId` (mismo id -> misma referencia siempre,
 * ver tests): se toma el uuid sin guiones (32 caracteres hexadecimales)
 * y se recorta a los primeros 20 — caracteres seguros (solo 0-9a-f),
 * trazable de vuelta al intent completo (basta con buscar por
 * `client_reference` en `booking_intents`, no hace falta poder
 * "deshacer" el recorte). Es un TRUNCADO, no un hash — la probabilidad
 * de que dos ids distintos compartan sus primeros 20 caracteres es
 * astronómicamente baja (80 bits), pero si ocurriera, la constraint
 * `booking_intents_client_reference_key` (UNIQUE real) lo rechazaría en
 * el INSERT en vez de aceptar dos intents con la misma referencia.
 */
export function generateHotelbedsClientReference(intentId: string): string {
  return intentId.replace(/-/g, "").slice(0, 20);
}

export async function createBookingIntent(
  input: CreateBookingIntentInput,
): Promise<CreateBookingIntentResult> {
  const service = createServiceRoleClient();
  const id = randomUUID();
  const clientReference = generateHotelbedsClientReference(id);

  const { data, error } = await service
    .from("booking_intents")
    .insert({
      id,
      user_id: input.userId,
      provider_name: input.providerName,
      provider_property_id: input.providerPropertyId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests: input.guests,
      rooms: input.rooms,
      client_reference: clientReference,
      status: "in_progress",
    })
    .select("id, client_reference, status")
    .single();

  if (error) {
    // 23505 = unique_violation real de Postgres — o bien el índice
    // parcial `booking_intents_dedup` (ya hay un intent in_progress para
    // esta misma tupla), o bien (mucho más improbable)
    // `booking_intents_client_reference_key`. En ambos casos es
    // exactamente "esta intención ya existe", nunca un fallo distinto.
    if (error.code === "23505") {
      return { outcome: "duplicate_booking_intent" };
    }
    return { outcome: "persistence_error", message: error.message };
  }
  if (!data) {
    return {
      outcome: "persistence_error",
      message: "No se pudo crear el booking intent (sin datos devueltos).",
    };
  }

  return {
    outcome: "intent_created",
    intent: {
      id: data.id as string,
      clientReference: data.client_reference as string,
      status: data.status as BookingIntentStatus,
    },
  };
}
