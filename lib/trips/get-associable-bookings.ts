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
  propertyName: string | null;
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

    // Bloque 11 — mismo criterio que lib/trips/get-trip-detail.ts: nombre
    // humano del alojamiento en vez del UUID en bruto, vía `properties`
    // (Patrón B, lectura abierta a cualquier usuario autenticado). `null`
    // si no se puede resolver — nunca se inventa un nombre.
    const propertyIds = [...new Set(data.map((row) => row.property_id as string))];
    const propertyNameById = new Map<string, string>();
    if (propertyIds.length > 0) {
      const { data: propertiesData } = await sessionClient
        .from("properties")
        .select("id, name")
        .in("id", propertyIds);
      for (const row of propertiesData ?? []) {
        propertyNameById.set(row.id as string, row.name as string);
      }
    }

    return data.map((row) => ({
      id: row.id as string,
      propertyId: row.property_id as string,
      propertyName: propertyNameById.get(row.property_id as string) ?? null,
      checkIn: row.check_in as string,
      checkOut: row.check_out as string,
      status: row.status as string,
      tripId: row.trip_id as string | null,
    }));
  } catch {
    return [];
  }
}
