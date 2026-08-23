import { createServiceRoleClient } from "../supabase/service";
import type { BookingIntentStatus } from "./create-booking-intent";

// FPR-04.6 — Transiciones de estado de un booking intent ya creado.
// Contraparte de `create-booking-intent.ts`, mismo patrón exacto que
// `update-booking-status.ts` (bookings) ya usa para `pending ->
// confirmed/cancelled`.
//
// Solo 3 funciones públicas, cada una con origen/destino fijos — nunca
// una función genérica `setStatus(intentId, cualquierEstado)`: evita
// transiciones arbitrarias (p. ej. "completed" -> "in_progress") que
// FPR-04.6 pide evitar explícitamente.
//
// Cada UPDATE incluye `.eq("status", "in_progress")` en el propio WHERE
// — la comprobación de que la transición es válida ocurre DENTRO de la
// misma operación atómica, nunca como un SELECT previo seguido de un
// UPDATE separado (misma filosofía que create-booking-intent.ts: nunca
// dos pasos con una ventana de carrera entre medias). Si el intent no
// existe, o ya no está en 'in_progress' (alguien más ya lo resolvió, o
// el id no corresponde a ningún intent real), la actualización
// simplemente no afecta ninguna fila — se distingue de un error real de
// Supabase (`persistence_error`), pero deliberadamente NO se distingue
// "no existe" de "ya no estaba in_progress": distinguirlos exigiría un
// SELECT adicional que esta función evita a propósito.
//
// FPR-04.7.1 — hallazgo real verificado contra Supabase local: cuando el
// UPDATE afecta 0 filas, `.single()` de PostgREST/supabase-js NO
// devuelve `{data: null, error: null}` — devuelve un `error` real con
// `code: "PGRST116"` ("JSON object requested, multiple (or no) rows
// returned"). Sin este caso especial, cualquier transición inválida
// (reintento sobre un intent ya resuelto, id inexistente) se clasificaba
// erróneamente como `persistence_error` en vez de
// `no_matching_in_progress_intent`. `PGRST116` es el único código que se
// trata como "0 filas", nunca como fallo real — cualquier otro código
// de error sigue siendo `persistence_error` sin cambios.
const NO_ROWS_RETURNED_ERROR_CODE = "PGRST116";

export type UpdateBookingIntentStatusResult =
  | { outcome: "success" }
  | { outcome: "no_matching_in_progress_intent" }
  | { outcome: "persistence_error"; message: string };

async function transitionFromInProgress(
  intentId: string,
  toStatus: BookingIntentStatus,
  extra?: { bookingId?: string },
): Promise<UpdateBookingIntentStatusResult> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("booking_intents")
    .update({
      status: toStatus,
      updated_at: new Date().toISOString(),
      ...(extra?.bookingId ? { booking_id: extra.bookingId } : {}),
    })
    .eq("id", intentId)
    .eq("status", "in_progress")
    .select("id")
    .single();

  if (error) {
    if (error.code === NO_ROWS_RETURNED_ERROR_CODE) {
      return { outcome: "no_matching_in_progress_intent" };
    }
    return { outcome: "persistence_error", message: error.message };
  }
  if (!data) {
    return { outcome: "no_matching_in_progress_intent" };
  }
  return { outcome: "success" };
}

/** `in_progress -> completed`, vinculando el `bookings.id` real ya creado. */
export function markBookingIntentCompleted(
  intentId: string,
  bookingId: string,
): Promise<UpdateBookingIntentStatusResult> {
  return transitionFromInProgress(intentId, "completed", { bookingId });
}

/** `in_progress -> failed` — el provider rechazó/falló con claridad, la tupla queda libre para una intención nueva. */
export function markBookingIntentFailed(intentId: string): Promise<UpdateBookingIntentStatusResult> {
  return transitionFromInProgress(intentId, "failed");
}

/** `in_progress -> provider_confirmed_orphaned` — Hotelbeds confirmó pero la persistencia en `bookings` falló (o hubo timeout sin respuesta clara); ver reconciliación, FPR-04.3. */
export function markBookingIntentProviderConfirmedOrphaned(
  intentId: string,
): Promise<UpdateBookingIntentStatusResult> {
  return transitionFromInProgress(intentId, "provider_confirmed_orphaned");
}
