import { createClient as createSessionClient } from "../supabase/server";
import type { SearchParams } from "../../types/travel";

// F6-01 (VIAO_ROADMAP.md) — Lectura de una búsqueda propia por id.
//
// Nueva función junto a `create-search-record.ts` (F5-06) — no se modifica
// ese archivo, solo se añade esta lectura complementaria. Mismo cliente
// (sesión, `lib/supabase/server.ts`) y mismo Patrón A/RLS que F5-06:
// `searches_select_own` (VIAO_DATABASE.md sección 5) ya permite `SELECT`
// al propietario (`user_id = auth.uid()`) — no se usa `service_role`
// (sería un privilegio más amplio del necesario), y RLS filtra
// automáticamente cualquier `search_id` válido en formato pero ajeno a
// otro usuario o inexistente: en ambos casos esta función simplemente
// devuelve `undefined`, sin necesidad de comprobarlo aparte.
//
// Usada por F6-01 para, cuando la reserva llega con un `search_id` válido
// (F5-07), poder mostrar "fechas/precio si vienen disponibles desde el
// flujo anterior" — ver app/booking/[propertyId]/resolve.ts. Best-effort,
// no bloqueante: un fallo aquí nunca debe romper la pantalla de reserva,
// solo hace que no se precargue nada.
export interface SearchRecord extends SearchParams {
  id: string;
}

export async function getSearchById(
  searchId: string,
): Promise<SearchRecord | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("searches")
      .select("id, destination, check_in, check_out, guests, rooms")
      .eq("id", searchId)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return {
      id: data.id,
      destination: data.destination,
      checkIn: data.check_in,
      checkOut: data.check_out,
      guests: data.guests,
      rooms: data.rooms,
    };
  } catch (error) {
    console.error(
      "[searches] Error inesperado leyendo la búsqueda por id:",
      error,
    );
    return undefined;
  }
}
