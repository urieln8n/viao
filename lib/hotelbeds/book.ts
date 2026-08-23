// Hotelbeds — Booking: POST /hotel-api/1.0/bookings. Bloque FPR-04.8.
//
// Deliberadamente separado de booking.ts (FPR-04.4): ese archivo se dejó
// puro a propósito (sin HTTP, ver su cabecera) — este SÍ necesita HTTP
// real, mismo motivo exacto por el que checkrate.ts se separó de
// availability.ts en FPR-04.5. No se duplica ningún tipo: `bookingRQ`/
// `booking` (respuesta) reutilizan `HotelbedsBookingRQ`/`HotelbedsRawBooking`
// de booking.ts tal cual.
//
// mTLS: SÍ requerido (misma exigencia que Availability/CheckRates, ver
// checkrate.ts) — usa `postHotelbeds`, nunca el transporte sin
// certificado de Content API.
import { postHotelbeds, type HotelbedsHttpResult } from "./http";
import type { HotelbedsBookingRQ, HotelbedsRawBooking } from "./booking";

const BOOKING_PATH = "/hotel-api/1.0/bookings";

/** Forma real confirmada contra el spec OpenAPI oficial (FPR-04, `bookingRS`): la reserva viaja anidada bajo `booking`. */
export interface HotelbedsBookingResponseEnvelope {
  booking?: HotelbedsRawBooking;
}

export type HotelbedsBookingTransport = (
  path: string,
  body: unknown,
) => Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>>;

/**
 * `transport` inyectable solo para tests — mismo criterio que
 * `fetchHotelbedsCheckRate`/`fetchHotelbedsAvailability`: `npm test`
 * nunca debe llamar a Hotelbeds real. Por defecto usa `postHotelbeds`
 * real (con mTLS).
 */
export async function fetchHotelbedsBooking(
  bookingRQ: HotelbedsBookingRQ,
  transport: HotelbedsBookingTransport = postHotelbeds,
): Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> {
  return transport(BOOKING_PATH, bookingRQ);
}
