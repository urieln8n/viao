import { createClient as createSessionClient } from "../supabase/server";
import type { SearchParams } from "../../types/travel";

// F5-06 (VIAO_ROADMAP.md) — Persistencia de la búsqueda en `searches`
// (VIAO_DATABASE.md sección 5) — distinta de `analytics_events` (F5-05):
// `searches` es dato de producto (contexto de la recomendación de IA, MVP
// sección 6.4; base para `bookings.search_id`), no un log de eventos.
//
// Seguridad: `searches` usa Patrón A (VIAO_DATABASE.md sección 5, "RLS
// Patrón A, sin modificación" — verificado en
// supabase/migrations/20260817140003_create_searches.sql y
// 20260817150000_enable_rls_and_policies.sql): `user_id` NOT NULL, GRANT
// de INSERT/SELECT únicamente para `authenticated` (nunca `anon`),
// `WITH CHECK user_id = auth.uid()`. A diferencia de `analytics_events`
// (Patrón B, `service_role`, F5-05), aquí NO se usa el cliente de
// servicio: el cliente autenticado por sesión (mismo mecanismo ya
// existente de F3-06/F5-05, `lib/supabase/server.ts`) ya tiene
// exactamente el permiso necesario — usar `service_role` aquí sería un
// privilegio más amplio del necesario para lo que F5-06 requiere.
//
// Usuario anónimo (verificado empíricamente contra Supabase local, no es
// un fallo): sin sesión, no existe ninguna vía legítima de crear la fila
// (`user_id` NOT NULL + sin GRANT de INSERT para `anon`) — se omite el
// insert, devolviendo `undefined`. La búsqueda en sí sigue funcionando con
// normalidad para el usuario anónimo (mismos resultados,
// `search_started`/`search_completed` de F5-05 se registran igual); solo
// queda sin fila persistida en `searches`, tal como exige el esquema real.
//
// Sin fila provisional: se inserta una única vez, con `results_count` ya
// conocido tras obtener y normalizar los resultados — la tabla no tiene
// GRANT de UPDATE para `authenticated` (log inmutable), así que un patrón
// insert-then-update no sería siquiera posible desde el cliente
// autenticado.
//
// Best-effort, no bloqueante (mismo criterio que F5-05): un fallo al
// persistir la búsqueda nunca debe impedir que el usuario vea sus
// resultados. Se captura cualquier error y se registra en consola.
export interface CreateSearchRecordInput {
  searchParams: SearchParams;
  resultsCount: number;
}

/** Devuelve el `searches.id` creado, o `undefined` si no hay usuario autenticado o el insert falla. */
export async function createSearchRecord({
  searchParams,
  resultsCount,
}: CreateSearchRecordInput): Promise<string | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return undefined;
    }

    const { data, error } = await sessionClient
      .from("searches")
      .insert({
        user_id: user.id,
        destination: searchParams.destination,
        check_in: searchParams.checkIn,
        check_out: searchParams.checkOut,
        guests: searchParams.guests,
        rooms: searchParams.rooms,
        results_count: resultsCount,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        "[searches] No se pudo crear el registro de búsqueda:",
        error.message,
      );
      return undefined;
    }

    return data?.id as string | undefined;
  } catch (error) {
    console.error(
      "[searches] Error inesperado creando el registro de búsqueda:",
      error,
    );
    return undefined;
  }
}
