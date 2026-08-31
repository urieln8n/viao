"use server";

import { createClient as createSessionClient } from "../../../lib/supabase/server";
import { getTripById } from "../../../lib/trips/get-trip-by-id";
import { associateBookingWithTrip } from "../../../lib/bookings/associate-trip";
import { isValidUuid } from "../../../lib/utils/is-valid-uuid";

// F11-02 (VIAO_ROADMAP.md) — Server Action de asociación de reserva a
// viaje.
//
// El cliente puede enviar como máximo: `tripId` (de la URL, no de un
// campo editable) y `bookingId` (elegido de la lista de SUS PROPIAS
// reservas, ver app/trips/[id]/associate-booking-form.tsx) — nunca un
// `user_id`.
//
// Orden de comprobaciones (hallazgo de la revisión final de F10 aplicado
// desde el primer commit de F11: cualquier escritura vía `service_role`
// que fije una foreign key hacia otra tabla debe verificar esa referencia
// contra una lectura protegida por RLS ANTES de escribir):
// 1. Formato de ambos ids.
// 2. Autenticación (fail-closed, F3-06).
// 3. Ownership del VIAJE — `getTripById(tripId)` (F11-01, RLS
//    `trips_select_own`) — indistinguible entre "no existe" y "es de
//    otro usuario", igual que el resto del proyecto.
// 4. `associateBookingWithTrip()` (F11-02, lib/bookings/) — el ownership
//    de la RESERVA se aplica dentro, vía `service_role` con
//    `.eq("user_id", userId)` explícito en el UPDATE.
export type AssociateBookingActionResult =
  | { status: "success"; associated: boolean }
  | { status: "unauthenticated" }
  | { status: "invalid_input" }
  | { status: "trip_not_found" };

export async function associateBookingAction(
  rawTripId: unknown,
  rawBookingId: unknown,
): Promise<AssociateBookingActionResult> {
  if (
    typeof rawTripId !== "string" ||
    !isValidUuid(rawTripId) ||
    typeof rawBookingId !== "string" ||
    !isValidUuid(rawBookingId)
  ) {
    return { status: "invalid_input" };
  }

  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return { status: "unauthenticated" };
  }

  const trip = await getTripById(rawTripId);
  if (!trip) {
    return { status: "trip_not_found" };
  }

  const result = await associateBookingWithTrip({
    bookingId: rawBookingId,
    tripId: rawTripId,
    userId,
  });

  return { status: "success", associated: result.associated };
}
