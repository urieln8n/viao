// F4-05 (VIAO_ROADMAP.md) — Adapter/selector del provider activo.
//
// Único punto del proyecto que sabe qué implementación concreta de
// `HotelProvider` está activa. El resto de VIAO debe importar el
// contrato/selector desde aquí (`lib/travel-provider`), nunca
// `MockHotelProvider`/`HotelbedsProvider` directamente.
//
// Selección vía `TRAVEL_PROVIDER` — fail-safe por defecto, mismo
// criterio que `AI_RECOMMENDATIONS_ENABLED`/`VISION_ENABLED`
// (lib/openai/config.ts): SOLO el valor exacto "hotelbeds" activa el
// camino no-mock; ausente, vacío o cualquier otro valor -> Mock. Esto es
// deliberado y provisional (bloque "conectar HotelbedsProvider de forma
// controlada"): Search puede funcionar con Hotelbeds real, pero
// `getDetails()`/`book()` siguen sin implementar en HotelbedsProvider —
// activar esta variable en producción rompería Properties/Booking (ver
// PRE-FLIGHT de este bloque). No hay fallback automático a Mock si
// Hotelbeds falla en runtime — decisión explícita: un fallo real debe
// verse como tal, nunca ocultarse detrás de datos ficticios.
//
// `HOTELBEDS_FIXED_HOTEL_CODES` (opcional, solo relevante si
// TRAVEL_PROVIDER=hotelbeds): códigos de hotel Hotelbeds explícitos,
// separados por comas, para poder probar el flujo de búsqueda real sin
// haber resuelto destino->código todavía (esa resolución sigue
// pendiente). Ausente/vacío/sin ningún entero válido -> `undefined`,
// nunca se inventa un código.

import type { HotelProviderTypes, TravelProvider } from "./types";
import type {
  AvailabilityQuery,
  AvailabilityResult,
  BookingRequest,
  BookingResult,
  CancellationRequest,
  CancellationResult,
  Commission,
  Conditions,
  ConditionsQuery,
  PriceQuery,
  PriceQuote,
  Property,
  SearchParams,
} from "../../types/travel";
import { MockHotelProvider } from "./mock-provider";
import { HotelbedsProvider } from "./hotelbeds-provider";

export type { HotelProvider, HotelProviderTypes, TravelProvider } from "./types";

/**
 * Instancia concreta de `HotelProviderTypes` (F4-01) con los tipos de
 * dominio de VIAO (F4-02). Es el contrato con el que trabaja el resto de
 * la app — independiente de qué implementación (mock o real) esté activa.
 * Deliberadamente definido aquí (la capa adapter), no en `mock-provider.ts`:
 * el resto de VIAO no debe depender de un tipo con nombre "Mock" en su
 * superficie pública.
 */
export interface ActiveHotelProviderTypes extends HotelProviderTypes {
  searchParams: SearchParams;
  property: Property;
  availabilityQuery: AvailabilityQuery;
  availabilityResult: AvailabilityResult;
  priceQuery: PriceQuery;
  priceQuote: PriceQuote;
  conditionsQuery: ConditionsQuery;
  conditions: Conditions;
  bookingRequest: BookingRequest;
  bookingResult: BookingResult;
  cancellationRequest: CancellationRequest;
  cancellationResult: CancellationResult;
  commission: Commission;
}

/** Tipo del provider activo, tal como lo debe consumir el resto de VIAO. */
export type ActiveTravelProvider = TravelProvider<ActiveHotelProviderTypes>;

export type TravelProviderKind = "mock" | "hotelbeds";

/**
 * `TRAVEL_PROVIDER` ausente, vacío, o cualquier valor distinto de
 * "hotelbeds" -> "mock". Función pura, sin caché — a diferencia de
 * `getTravelProvider()` (singleton, ver más abajo), se puede llamar en
 * cualquier momento y siempre refleja el entorno actual.
 */
export function resolveTravelProviderKind(): TravelProviderKind {
  return process.env.TRAVEL_PROVIDER === "hotelbeds" ? "hotelbeds" : "mock";
}

/**
 * `HOTELBEDS_FIXED_HOTEL_CODES` ("3424,168") -> `[3424, 168]`. Cualquier
 * token que no sea un entero positivo se descarta (no invalida el resto
 * de la lista: no hay implicación de seguridad en qué hoteles se buscan,
 * a diferencia de las credenciales). `undefined` si la variable no está,
 * está vacía, o no queda ningún código válido tras filtrar — nunca se
 * inventa un código de hotel.
 */
export function getFixedHotelbedsHotelCodes(): number[] | undefined {
  const raw = process.env.HOTELBEDS_FIXED_HOTEL_CODES?.trim();
  if (!raw) {
    return undefined;
  }
  const codes = raw
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((code) => Number.isInteger(code) && code > 0);
  return codes.length > 0 ? codes : undefined;
}

let cachedProvider: ActiveTravelProvider | undefined;

/**
 * Devuelve la implementación activa de `TravelProvider`/`HotelProvider`
 * (F4-01). Es el ÚNICO lugar del proyecto que decide cuál es — siempre la
 * misma instancia (singleton perezoso), necesario para que el estado en
 * memoria de una reserva (F4-04) sea coherente entre llamadas. Consecuencia
 * de ser singleton: la selección se fija en la PRIMERA llamada del
 * proceso — cambiar `TRAVEL_PROVIDER` en caliente sin reiniciar el
 * proceso no tiene efecto (mismo comportamiento que cualquier variable
 * de entorno de Next.js/Vercel, no es una limitación nueva de este
 * archivo).
 */
export function getTravelProvider(): ActiveTravelProvider {
  if (!cachedProvider) {
    cachedProvider =
      resolveTravelProviderKind() === "hotelbeds"
        ? new HotelbedsProvider({ fixedHotelCodes: getFixedHotelbedsHotelCodes() })
        : new MockHotelProvider();
  }
  return cachedProvider;
}
