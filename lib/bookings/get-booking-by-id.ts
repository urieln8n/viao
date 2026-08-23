import { createServiceRoleClient } from "../supabase/service";
import type { BookingStatus } from "../../types/travel";

// FPR-04.12 — Lectura de una reserva propia por id, necesaria para poder
// cancelarla (lib/bookings/cancel-booking.ts): antes de llamar al
// provider hace falta el `provider_booking_reference` real de la fila.
//
// Ownership: mismo criterio exacto que `updateBookingStatus`
// (`lib/bookings/update-booking-status.ts`) — `service_role` bypassa RLS,
// así que el ownership se aplica explícitamente en la propia consulta
// (`.eq("user_id", userId)`), nunca de forma implícita. Una reserva
// inexistente y una reserva real de OTRO usuario producen el mismo
// `undefined` — indistinguibles a propósito, mismo criterio ya usado en
// `getSearchById` (F6-06) y documentado en app/booking/actions.ts.
export interface BookingSummary {
  id: string;
  status: BookingStatus;
  providerBookingReference: string | undefined;
}

export async function getBookingById(
  bookingId: string,
  userId: string,
): Promise<BookingSummary | undefined> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("bookings")
    .select("id, status, provider_booking_reference")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return undefined;
  }

  return {
    id: data.id as string,
    status: data.status as BookingStatus,
    providerBookingReference: (data.provider_booking_reference as string | null) ?? undefined,
  };
}
