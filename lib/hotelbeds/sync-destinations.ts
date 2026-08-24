// Hotelbeds — sync manual del catálogo de Locations/Destinations hacia
// `destinations` (Supabase). Bloque FPR-HOTELS-02.
//
// Deliberadamente un proceso MANUAL (mismo criterio que sync-content.ts):
// con un catálogo que cabe en 1-2 páginas (España = 74 destinos, muy por
// debajo del límite real de 1000/página confirmado en FPR-HOTELS-01) no
// se justifica un cron.
//
// Paginación real: `from`/`to` con un máximo de 1000 elementos por
// respuesta (error real reproducido con un rango mayor, ver
// destinations.ts). Este sync pagina de todos modos aunque España quepa
// en una sola página, para que ampliar `countryCodes` a catálogos más
// grandes (FR/IT/UK) no requiera cambiar esta función.
//
// A diferencia de sync-content.ts (fail-closed: un solo hotel ausente
// aborta todo con solo 2 hoteles fijos y controlados), aquí una fila
// individual incompleta se descarta en silencio
// (mapHotelbedsRawDestinations, destinations-mappers.ts) sin abortar el
// resto — con decenas/cientos de destinos, una fila mala es ruido
// esperable del catálogo, no una señal de que algo va mal con la
// petición en sí.
import {
  fetchHotelbedsDestinations,
  type HotelbedsDestinationsTransport,
} from "./destinations";
import { mapHotelbedsRawDestinations } from "./destinations-mappers";
import { upsertDestinationCache } from "../destinations/upsert-destination-cache";

const HOTELBEDS_DESTINATIONS_PAGE_SIZE = 1000;
const PROVIDER_NAME = "hotelbeds";

export type HotelbedsDestinationsSyncOutcome =
  | { status: "success"; syncedCount: number; skippedCount: number }
  | { status: "missing_credentials"; message: string }
  | { status: "network_error"; message: string }
  | { status: "http_error"; httpStatus: number; body: unknown };

export interface HotelbedsDestinationsSyncDependencies {
  /** Inyectable solo para tests — por defecto, getHotelbedsContent real (sin mTLS, ver content-http.ts). */
  transport?: HotelbedsDestinationsTransport;
  /** Inyectable solo para tests — por defecto, upsertDestinationCache real (Supabase). */
  upsert?: typeof upsertDestinationCache;
  /** Por defecto "CAS" (castellano) — mismo idioma ya usado en el resto del Content API. */
  language?: string;
  /** Inyectable solo para tests (páginas pequeñas, sin depender del límite real de 1000). */
  pageSize?: number;
}

/**
 * `countryCodes` es un parámetro explícito (nunca una variable de
 * entorno oculta): quien ejecuta el sync decide el alcance geográfico
 * cada vez — hoy `["ES"]` (MVP V1.0, mercado inicial España,
 * VIAO_MVP_v0.1.md sección 3), ampliable a FR/IT/UK sin tocar esta
 * función.
 */
export async function syncHotelbedsDestinations(
  countryCodes: string[],
  dependencies: HotelbedsDestinationsSyncDependencies = {},
): Promise<HotelbedsDestinationsSyncOutcome> {
  const upsert = dependencies.upsert ?? upsertDestinationCache;
  const language = dependencies.language ?? "CAS";
  const pageSize = dependencies.pageSize ?? HOTELBEDS_DESTINATIONS_PAGE_SIZE;

  let from = 1;
  let total: number | undefined;
  let syncedCount = 0;
  let skippedCount = 0;

  do {
    const to = from + pageSize - 1;
    const response = await fetchHotelbedsDestinations(
      { countryCodes, language, from, to },
      dependencies.transport,
    );

    switch (response.outcome) {
      case "missing_credentials":
        return { status: "missing_credentials", message: response.message };
      case "network_error":
        return { status: "network_error", message: response.message };
      case "http_error":
        return { status: "http_error", httpStatus: response.httpStatus, body: response.body };
      case "success":
        break;
    }

    total = response.body.total ?? 0;
    const rawDestinations = response.body.destinations ?? [];
    const mapped = mapHotelbedsRawDestinations(rawDestinations);
    skippedCount += rawDestinations.length - mapped.length;

    for (const destination of mapped) {
      await upsert(PROVIDER_NAME, destination);
      syncedCount += 1;
    }

    // Salvaguarda: si Hotelbeds devolviera una página vacía sin reflejarlo
    // en `total`, nunca se entra en un bucle infinito.
    if (rawDestinations.length === 0) {
      break;
    }
    from += pageSize;
  } while (from <= total);

  return { status: "success", syncedCount, skippedCount };
}
