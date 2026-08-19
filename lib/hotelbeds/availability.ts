// Hotelbeds — Availability ("Hotels" method del Booking API):
// POST /hotel-api/1.0/hotels. Devuelve, para uno o varios hoteles, sus
// habitaciones/tarifas disponibles para unas fechas concretas.
//
// ⚠️ IMPORTANTE — sin verificar contra una respuesta real: durante este
// bloque solo se autorizaron peticiones reales a /status y a
// /hotel-content-api/1.0/locations/destinations (investigación de
// códigos de destino), nunca a este endpoint de disponibilidad. Los
// tipos de request/response de este archivo están construidos a partir
// de documentación oficial y fuentes secundarias convergentes (varias
// citas independientes coinciden en los mismos nombres de campo), pero
// NO están confirmados contra una llamada real todavía. Cuando se
// autorice la primera petición real a este endpoint, hay que revisar
// estos tipos contra la respuesta real y corregir lo que no coincida.
import { postHotelbeds, type HotelbedsHttpResult } from "./http";

const AVAILABILITY_PATH = "/hotel-api/1.0/hotels";

/**
 * Punto de entrada al buscador: o bien un código de destino Hotelbeds
 * ("MAD", "BCN"...) o bien una lista explícita de códigos de hotel.
 * VIAO no resuelve `destination → code` todavía (bloque de investigación
 * pendiente, ver conversación) — este tipo solo modela lo que Hotelbeds
 * espera, quien construye el `code` es responsabilidad de quien llama
 * (lib/travel-provider/hotelbeds-provider.ts).
 */
export type HotelbedsAvailabilityScope =
  | { type: "destination"; code: string }
  | { type: "hotelCodes"; codes: number[] };

export interface HotelbedsAvailabilityRequest {
  checkIn: string;
  checkOut: string;
  /** Número de habitaciones — VIAO no distingue ocupación por habitación, ver `buildOccupancies`. */
  rooms: number;
  /** Huéspedes totales — se reparten entre `rooms` de forma uniforme, ver `buildOccupancies`. */
  guests: number;
  scope: HotelbedsAvailabilityScope;
}

/**
 * Hotelbeds pide un array de ocupaciones por "grupo de habitaciones
 * idénticas" (`{rooms, adults, children}`), no huéspedes totales. VIAO
 * solo modela `guests`+`rooms` (types/travel.ts), así que aquí se
 * reparten los huéspedes de forma uniforme en un único grupo — una
 * simplificación deliberada, no un dato inventado de Hotelbeds: no hay
 * desglose de niños ni de ocupación distinta por habitación en el
 * dominio de VIAO todavía.
 */
export function buildOccupancies(
  guests: number,
  rooms: number,
): { rooms: number; adults: number; children: number }[] {
  return [{ rooms, adults: Math.max(1, Math.ceil(guests / rooms)), children: 0 }];
}

export function buildHotelbedsAvailabilityRequestBody(
  request: HotelbedsAvailabilityRequest,
): unknown {
  return {
    stay: { checkIn: request.checkIn, checkOut: request.checkOut },
    occupancies: buildOccupancies(request.guests, request.rooms),
    ...(request.scope.type === "destination"
      ? { destination: { code: request.scope.code } }
      : { hotels: { hotel: request.scope.codes } }),
  };
}

/** Tarifa de una habitación concreta. `net`/`from` vienen como STRING en la API real de Hotelbeds (confirmado por múltiples fuentes documentales), no como number. */
export interface HotelbedsRawRate {
  rateKey: string;
  rateClass?: string;
  rateType?: string;
  net: string;
  boardCode?: string;
  boardName?: string;
  cancellationPolicies?: { amount: string; from: string }[];
}

export interface HotelbedsRawRoom {
  code: string;
  name: string;
  rates: HotelbedsRawRate[];
}

export interface HotelbedsRawHotel {
  code: number;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  destinationCode?: string;
  destinationName?: string;
  /** String en la respuesta real de Hotelbeds (confirmado por documentación), no number. */
  latitude?: string;
  longitude?: string;
  /**
   * NO CONFIRMADO: no se ha podido verificar en una respuesta real si la
   * moneda viene aquí (a nivel de hotel) o en otro nivel de la
   * respuesta. Se modela como opcional a propósito — los mappers no
   * inventan "EUR" si este campo falta.
   */
  currency?: string;
  rooms: HotelbedsRawRoom[];
}

export interface HotelbedsAvailabilityResponse {
  hotels?: {
    total?: number;
    hotels: HotelbedsRawHotel[];
  };
}

export type HotelbedsAvailabilityTransport = (
  path: string,
  body: unknown,
) => Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>>;

/**
 * `transport` es inyectable únicamente para tests (mockear HTTP sin red
 * real, mismo criterio que el resto del proyecto: `npm test` nunca debe
 * llamar a Hotelbeds real ni consumir cuota de sandbox). Por defecto usa
 * `postHotelbeds` real.
 */
export async function fetchHotelbedsAvailability(
  request: HotelbedsAvailabilityRequest,
  transport: HotelbedsAvailabilityTransport = postHotelbeds,
): Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>> {
  return transport(AVAILABILITY_PATH, buildHotelbedsAvailabilityRequestBody(request));
}
