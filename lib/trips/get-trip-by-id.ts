import { createClient as createSessionClient } from "../supabase/server";

// F11-01/F11-04 (VIAO_ROADMAP.md) — Lectura de un viaje propio por id.
// Mismo patrón que `getSearchById` (F6-01): cliente de sesión,
// `trips_select_own` (RLS Patrón A) ya filtra automáticamente cualquier
// id ajeno o inexistente — ambos casos devuelven `undefined` sin
// distinción, nunca hace falta comprobarlo aparte. Fuera de una petición
// real de Next.js: se captura y se devuelve `undefined` (mismo criterio
// de resiliencia fail-closed que el resto del proyecto).
export interface TripRecord {
  id: string;
  userId: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
}

export async function getTripById(
  tripId: string,
): Promise<TripRecord | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("trips")
      .select("id, user_id, destination, start_date, end_date")
      .eq("id", tripId)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return {
      id: data.id as string,
      userId: data.user_id as string,
      destination: data.destination as string,
      startDate: data.start_date as string | null,
      endDate: data.end_date as string | null,
    };
  } catch (error) {
    console.error("[trips] Error inesperado leyendo el viaje por id:", error);
    return undefined;
  }
}
