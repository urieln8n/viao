// Hotelbeds — Content API, operación "Locations/Destinations": GET
// /hotel-content-api/1.0/locations/destinations. Devuelve el catálogo de
// destinos (código + nombre) por el que se puede buscar disponibilidad —
// confirmado real en FPR-HOTELS-01 (única petición autorizada, sandbox,
// GET .../locations/destinations?countryCodes=ES,FR,IT&language=CAS&
// fields=all&from=1&to=1000, ver conversación). Hallazgos confirmados
// empíricamente:
// - Sin mTLS: igual que content.ts (`/hotels`), responde 200 solo con
//   Api-key + X-Signature — misma familia de API, mismo transporte
//   (getHotelbedsContent, content-http.ts).
// - Paginación real: el máximo por página es 1000 elementos
//   ("Invalid data. The number of elements in response are limited to
//   1000" — error real reproducido con `to=2000`). España completa (74
//   destinos) cabe en una sola página; `syncHotelbedsDestinations.ts`
//   igualmente pagina por si el alcance crece a países más grandes.
// - `destinations[].name` es multilingüe (`{content: "..."}`), igual que
//   `HotelbedsContentText` de content.ts — reutilizado aquí, no
//   duplicado.
// - Sin parámetro de búsqueda por texto libre: solo `codes`/`countryCodes`
//   como filtros — por eso este catálogo debe sincronizarse/cachearse,
//   nunca consultarse en vivo por nombre.
import { getHotelbedsContent, type HotelbedsContentHttpResult } from "./content-http";
import type { HotelbedsContentText } from "./content";

const DESTINATIONS_PATH = "/hotel-content-api/1.0/locations/destinations";

export interface HotelbedsDestinationsRequest {
  /** Códigos de país Hotelbeds (p. ej. ["ES"]) — filtro real confirmado, ver conversación. */
  countryCodes: string[];
  language: string;
  /** Rango de paginación real de Hotelbeds — máximo 1000 elementos por página (confirmado empíricamente). */
  from: number;
  to: number;
}

export interface HotelbedsRawDestination {
  code: string;
  countryCode?: string;
  isoCode?: string;
  name?: HotelbedsContentText;
  zones?: unknown[];
}

export interface HotelbedsDestinationsResponse {
  from?: number;
  to?: number;
  total?: number;
  destinations?: HotelbedsRawDestination[];
}

function buildDestinationsPath(request: HotelbedsDestinationsRequest): string {
  const params = new URLSearchParams({
    countryCodes: request.countryCodes.join(","),
    language: request.language,
    fields: "all",
    from: String(request.from),
    to: String(request.to),
  });
  return `${DESTINATIONS_PATH}?${params.toString()}`;
}

export type HotelbedsDestinationsTransport = (
  path: string,
) => Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>>;

/**
 * `transport` inyectable solo para tests (mismo criterio que
 * fetchHotelbedsContent): `npm test` nunca debe llamar a Hotelbeds real ni
 * consumir cuota de sandbox. Por defecto usa `getHotelbedsContent` real
 * (sin mTLS, ver content-http.ts).
 */
export async function fetchHotelbedsDestinations(
  request: HotelbedsDestinationsRequest,
  transport: HotelbedsDestinationsTransport = getHotelbedsContent,
): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> {
  return transport(buildDestinationsPath(request));
}
