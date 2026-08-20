import { createServiceRoleClient } from "../supabase/service";

// FASE 2 (bloque "Search ↔ properties") — lectura de la caché de
// `properties` para enriquecer resultados de Search. Contraparte de
// lectura de `upsert-property-cache.ts` (escritura) — mismo cliente
// (`service_role`), mismo motivo: la policy RLS de `properties`
// (`properties_select_all`, migración 20260817150000) es `to
// authenticated` únicamente, y Search funciona también para usuarios
// anónimos, así que el cliente de sesión no serviría aquí — `service_role`
// ya tiene GRANT de SELECT desde F6-02.
//
// UNA sola query por búsqueda (`IN (...)`), nunca una por hotel —
// pensado para que quien llame (HotelbedsProvider.search()) reúna antes
// todos los `providerPropertyId` de una tanda de resultados y pida la
// caché de todos a la vez.
//
// Nunca lanza: un fallo aquí (Supabase caído, credenciales de servicio
// ausentes, red, lo que sea) es exactamente igual a "ningún hotel tiene
// caché todavía" — Search no debe romperse ni degradar su resultado
// dinámico (precio/disponibilidad) por un problema en el enriquecimiento
// estático. Se devuelve un Map vacío en cualquier caso de error.
//
// FASE 3 (bloque "Property detail") — se añaden `name` y `raw` (columna
// `raw_data`) al select: `mergePropertyWithCache` (lib/hotelbeds/
// mappers.ts) sigue ignorándolos por completo (Search nunca debe pisar
// el `name` real que ya trae Availability con el de la caché, ni cargar
// el JSON completo en cada resultado de búsqueda) — solo los usa
// `HotelbedsProvider.getDetails()`, que reconstruye un `Property`
// completo DESDE CERO (sin ningún `Property` de Availability previo al
// que fusionarse) y sí necesita ambos.
export interface CachedPropertyContent {
  name?: string;
  mainPhotoUrl?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  raw?: unknown;
}

/** Indexado por `provider_property_id` para que el merge de cada resultado sea O(1), no una búsqueda lineal. */
export async function getCachedProperties(
  providerName: string,
  providerPropertyIds: string[],
): Promise<Map<string, CachedPropertyContent>> {
  if (providerPropertyIds.length === 0) {
    return new Map();
  }

  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("properties")
      .select("provider_property_id, name, main_photo_url, country, city, latitude, longitude, raw_data")
      .eq("provider_name", providerName)
      .in("provider_property_id", providerPropertyIds);

    if (error || !data) {
      return new Map();
    }

    const cache = new Map<string, CachedPropertyContent>();
    for (const row of data) {
      cache.set(row.provider_property_id as string, {
        name: (row.name as string | null) ?? undefined,
        mainPhotoUrl: (row.main_photo_url as string | null) ?? undefined,
        country: (row.country as string | null) ?? undefined,
        city: (row.city as string | null) ?? undefined,
        latitude: row.latitude === null ? undefined : Number(row.latitude),
        longitude: row.longitude === null ? undefined : Number(row.longitude),
        raw: row.raw_data ?? undefined,
      });
    }
    return cache;
  } catch {
    return new Map();
  }
}
