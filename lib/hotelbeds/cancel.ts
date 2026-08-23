// Hotelbeds — Cancellation: DELETE /hotel-api/1.0/bookings/{bookingId}.
// Bloque FPR-04.11.
//
// Deliberadamente separado de cancellation.ts (mapper puro, sin HTTP) —
// mismo motivo exacto por el que book.ts se separó de booking.ts. `path`
// lleva `bookingId` (= `CancellationRequest.providerBookingReference`,
// confirmado contra el spec OpenAPI: "Booking reference number taken from
// the confirmation response") como segmento de ruta, más
// `cancellationFlag=CANCELLATION` en el query — nunca `SIMULATION`: esta
// función SIEMPRE ejecuta la cancelación real cuando se llama (el modo
// simulación existe en la API de Hotelbeds pero no se usa aquí; no hay
// ninguna decisión tomada todavía sobre si VIAO debería ofrecerlo).
//
// mTLS: SÍ requerido (mismo criterio que Availability/CheckRates/Booking,
// ver checkrate.ts/book.ts) — usa `postHotelbeds`, con `method="DELETE"`
// y `requestBody=undefined` (esta llamada no lleva cuerpo, ver la
// generalización aditiva de http.ts en este mismo bloque).
import { postHotelbeds, type HotelbedsHttpResult } from "./http";
import type { HotelbedsRawCancellation } from "./cancellation";

const CANCELLATION_FLAG = "CANCELLATION";

/** Forma real confirmada contra el spec OpenAPI oficial (FPR-04.11, `bookingCancellationRS`): la reserva cancelada viaja anidada bajo `booking`, igual que en la respuesta de creación. */
export interface HotelbedsCancellationResponseEnvelope {
  booking?: HotelbedsRawCancellation;
}

export type HotelbedsCancellationTransport = (
  path: string,
  body: unknown,
) => Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>>;

/** `providerBookingReference` va tal cual en la ruta, nunca transformado — mismo criterio que `rateKey` en checkrate.ts. */
export function buildHotelbedsCancellationPath(providerBookingReference: string): string {
  return `/hotel-api/1.0/bookings/${encodeURIComponent(providerBookingReference)}?cancellationFlag=${CANCELLATION_FLAG}`;
}

async function defaultCancellationTransport(
  path: string,
): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> {
  return postHotelbeds(path, undefined, "DELETE");
}

/**
 * `transport` inyectable solo para tests — mismo criterio que
 * `fetchHotelbedsBooking`/`fetchHotelbedsCheckRate`: `npm test` nunca debe
 * llamar a Hotelbeds real. Por defecto usa `postHotelbeds` real (mTLS,
 * método DELETE, sin body).
 */
export async function fetchHotelbedsCancellation(
  providerBookingReference: string,
  transport: HotelbedsCancellationTransport = defaultCancellationTransport,
): Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> {
  return transport(buildHotelbedsCancellationPath(providerBookingReference), undefined);
}
