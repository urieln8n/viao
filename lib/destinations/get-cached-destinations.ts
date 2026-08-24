import { createServiceRoleClient } from "../supabase/service";

// FPR-HOTELS-02 — Lectura del catálogo de `destinations` cacheado.
// Mismo motivo exacto que `get-cached-properties.ts`: la policy RLS de
// `destinations` (`destinations_select_all`, migración
// 20260823140000) es `to authenticated` únicamente, pero Search/el
// autocomplete deben funcionar también para usuarios anónimos — por eso
// `service_role` (con GRANT de SELECT ya concedido en esa misma
// migración), nunca el cliente de sesión.
//
// Devuelve el catálogo COMPLETO para un `providerName` — a diferencia de
// `getCachedProperties` (que solo pide los ids de una tanda de
// resultados), aquí no hay una lista previa de "candidatos": el catálogo
// de España son 74 filas, cabe entero en una sola consulta y sirve tanto
// al resolver (búsqueda exacta por nombre) como al autocomplete (filtrado
// client-side, igual que hacía `listKnownDestinations()` del mock).
//
// Nunca lanza: mismo criterio que `getCachedProperties` — un fallo aquí
// (Supabase caído, credenciales de servicio ausentes) se trata igual que
// "catálogo vacío todavía", nunca rompe Search.
export interface CachedDestination {
  code: string;
  name: string;
  countryCode: string;
}

export async function getCachedDestinations(
  providerName: string,
): Promise<CachedDestination[]> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("destinations")
      .select("code, name, country_code")
      .eq("provider_name", providerName)
      .order("name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      code: row.code as string,
      name: row.name as string,
      countryCode: row.country_code as string,
    }));
  } catch {
    return [];
  }
}
