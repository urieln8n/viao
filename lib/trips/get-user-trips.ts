import { createClient as createSessionClient } from "../supabase/server";

// F11-01 (VIAO_ROADMAP.md) — Lista de los viajes propios del usuario
// autenticado, para `app/trips/page.tsx`. Mismo patrón que
// `getRewardTransactions` (F7-02): cliente de sesión,
// `trips_select_own` ya filtra por `user_id = auth.uid()`, best-effort
// (lista vacía si falla, nunca rompe la pantalla).
export interface TripListItem {
  id: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
}

export async function getUserTrips(): Promise<TripListItem[]> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("trips")
      .select("id, destination, start_date, end_date")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      destination: row.destination as string,
      startDate: row.start_date as string | null,
      endDate: row.end_date as string | null,
    }));
  } catch {
    return [];
  }
}
