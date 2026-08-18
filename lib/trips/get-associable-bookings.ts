import { createClient as createSessionClient } from "../supabase/server";

// F11-02 (VIAO_ROADMAP.md) — Lista de las reservas propias del usuario,
// para el selector de "asociar reserva a este viaje". Mismo patrón que
// `getRewardTransactions`/`getUserTrips`: cliente de sesión,
// `bookings_select_own` ya filtra por `user_id = auth.uid()`.
//
// Se listan TODAS las reservas propias (asociadas o no a otro viaje, o a
// este mismo) — el esquema real no impone ninguna restricción de
// unicidad sobre `bookings.trip_id`, así que no se inventa una regla de
// "una reserva solo puede tener un viaje para siempre": el usuario puede
// reasignarla libremente. `tripId` se expone para que la UI pueda
// indicar, si quiere, cuáles ya están asociadas a este viaje.
export interface AssociableBooking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  tripId: string | null;
}

export async function getAssociableBookings(): Promise<AssociableBooking[]> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("bookings")
      .select("id, property_id, check_in, check_out, status, trip_id")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      propertyId: row.property_id as string,
      checkIn: row.check_in as string,
      checkOut: row.check_out as string,
      status: row.status as string,
      tripId: row.trip_id as string | null,
    }));
  } catch {
    return [];
  }
}
