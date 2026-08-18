import { createServiceRoleClient } from "../supabase/service";

// F11-02 (VIAO_ROADMAP.md) — Asocia una reserva existente a un viaje
// (`bookings.trip_id`). Mismo patrón exacto que `update-booking-status.ts`
// (F6-03): `bookings` es Patrón B, sin GRANT de UPDATE para el cliente
// bajo ninguna circunstancia; `service_role` ya tiene GRANT de UPDATE
// desde `20260818090000_grant_service_role_bookings_update.sql` (F6-03)
// — no hace falta ninguna migración nueva para F11-02, es el mismo
// privilegio, solo se escribe una columna distinta.
//
// `service_role` bypassa RLS, así que el ownership de la RESERVA se
// aplica aquí explícitamente (`.eq("id", bookingId).eq("user_id", userId)`)
// — sin esa condición, `service_role` podría reasignar la reserva de
// cualquier usuario.
//
// Ownership del VIAJE de destino (hallazgo de la revisión final de F11,
// misma clase que el de la revisión final de F10 sobre
// `photos_insert_own`): `app/trips/[id]/actions.ts` YA comprueba el
// viaje con `getTripById()` (cliente de sesión, RLS) antes de llamar
// aquí, pero confiar ÚNICAMENTE en esa comprobación del llamador deja
// esta función explotable si algún código futuro la invoca sin repetirla
// — verificado empíricamente antes de esta corrección: llamando a esta
// función directamente con la reserva legítima de un atacante y el
// `tripId` de otro usuario, la asociación se completaba con éxito. Se
// comprueba aquí también, de forma redundante pero necesaria (defensa en
// profundidad): el viaje debe existir Y pertenecer a `userId`, con
// `service_role` (que bypassa RLS) y un `.eq("user_id", userId)`
// explícito — mismo patrón que la comprobación de la reserva, nunca se
// confía un id "es mío" sin verificarlo contra la fila real.
export interface AssociateBookingWithTripInput {
  bookingId: string;
  tripId: string;
  userId: string;
}

export interface AssociateBookingWithTripResult {
  associated: boolean;
}

export async function associateBookingWithTrip({
  bookingId,
  tripId,
  userId,
}: AssociateBookingWithTripInput): Promise<AssociateBookingWithTripResult> {
  const service = createServiceRoleClient();

  const { data: trip, error: tripError } = await service
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (tripError) {
    throw new Error(
      `No se pudo verificar la propiedad del viaje "${tripId}": ${tripError.message}`,
    );
  }
  if (!trip) {
    return { associated: false };
  }

  const { data, error } = await service
    .from("bookings")
    .update({ trip_id: tripId, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error(
      `No se pudo asociar la reserva "${bookingId}" al viaje: ${error.message}`,
    );
  }

  return { associated: Boolean(data && data.length > 0) };
}
