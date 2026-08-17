// F4-05 (VIAO_ROADMAP.md) — Adapter/selector del provider activo.
//
// Único punto del proyecto que sabe qué implementación concreta de
// `HotelProvider` está activa. El resto de VIAO debe importar el
// contrato/selector desde aquí (`lib/travel-provider`), nunca
// `MockHotelProvider` directamente.
//
// Hoy no existe ningún proveedor real seleccionado (MVP sección 18,
// decisión pendiente) ni ninguna variable de entorno documentada para
// elegir entre implementaciones (VIAO_ARCHITECTURE.md sección 22 y
// `.env.example` no la contemplan) — por eso no se introduce ninguna
// variable nueva. Cuando exista un proveedor real, cambiar de
// `MockHotelProvider` a esa implementación requiere modificar únicamente
// el cuerpo de `getTravelProvider()`, sin tocar el resto del código.

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

let cachedProvider: ActiveTravelProvider | undefined;

/**
 * Devuelve la implementación activa de `TravelProvider`/`HotelProvider`
 * (F4-01). Es el ÚNICO lugar del proyecto que decide cuál es — siempre la
 * misma instancia (singleton perezoso), necesario para que el estado en
 * memoria de una reserva (F4-04) sea coherente entre llamadas.
 */
export function getTravelProvider(): ActiveTravelProvider {
  if (!cachedProvider) {
    cachedProvider = new MockHotelProvider();
  }
  return cachedProvider;
}
