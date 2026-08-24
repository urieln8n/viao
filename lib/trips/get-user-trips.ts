import { createClient as createSessionClient } from "../supabase/server";

// F11-01 (VIAO_ROADMAP.md) — Lista de los viajes propios del usuario
// autenticado, para `app/trips/page.tsx`. Mismo patrón que
// `getRewardTransactions` (F7-02): cliente de sesión,
// `trips_select_own` ya filtra por `user_id = auth.uid()`, best-effort.
//
// Bloque Claridad de producto V1 — distingue explícitamente "sin sesión"
// (`undefined`) de "con sesión, sin viajes todavía" (`[]`), mismo
// criterio ya establecido en `get-wallet-balance.ts`
// (`app/rewards/page.tsx` ya lo usa para mostrar un estado de "inicia
// sesión" en vez de un vacío ambiguo) — `app/trips/page.tsx` hacía
// exactamente esa misma distinción imposible antes de este cambio,
// mostrando el mismo "no tienes viajes" tanto a un usuario anónimo como
// a uno real sin viajes.
export interface TripListItem {
  id: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
}

export async function getUserTrips(): Promise<TripListItem[] | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return undefined;
    }

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
