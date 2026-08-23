// Hotelbeds — Cancellation: mapper PURO de la respuesta de
// `DELETE /hotel-api/1.0/bookings/{bookingId}`. Bloque FPR-04.11.
//
// Deliberadamente sin HTTP (igual que booking.ts, FPR-04.4) — el
// transporte real vive en lib/hotelbeds/cancel.ts, mismo criterio exacto
// que la separación book.ts/booking.ts.
//
// Reutiliza `mapHotelbedsBookingStatus`/`parseHotelbedsMonetaryAmount` de
// booking.ts en vez de duplicarlas: la respuesta de cancelación usa
// exactamente el mismo `ApiBooking` (spec OpenAPI, ver
// components/schemas/bookingCancellationRS -> booking: $ref ApiBooking)
// que ya modela ese archivo — mismos valores de `status`
// (PRECONFIRMED/CONFIRMED/CANCELLED), mismo formato tolerante string/number
// para importes.
import { mapHotelbedsBookingStatus, parseHotelbedsMonetaryAmount } from "./booking";
import type { CancellationResult } from "../../types/travel";

/**
 * Únicamente los campos de `ApiBooking` que esta operación necesita.
 * `cancellationAmount` NO está en la raíz de `ApiBooking` (confirmado
 * contra el spec OpenAPI, FPR-04): vive anidado en `ApiHotel`
 * (`booking.hotel.cancellationAmount`), de ahí el sub-objeto `hotel` aquí
 * — nunca verificado contra una respuesta real (esta cuenta nunca ha
 * cancelado una reserva real, no existe ninguna que cancelar todavía).
 */
export interface HotelbedsRawCancellation {
  cancellationReference?: string;
  /** String tal cual la envía Hotelbeds ("CANCELLED", u otro valor no contemplado) — se valida en mapHotelbedsBookingStatus, nunca se asume aquí. */
  status?: string;
  hotel?: {
    /** Número según el spec — sin verificar contra una respuesta real (mismo motivo que totalNet en booking.ts: podría llegar como string). */
    cancellationAmount?: number | string;
  };
}

export type MapHotelbedsCancellationResponseResult =
  | { outcome: "success"; result: CancellationResult }
  | { outcome: "unknown_status"; rawStatus: string };

/**
 * `ApiBooking` real (tras cancelar) -> `CancellationResult` de dominio.
 * `cancelled` refleja el status REAL devuelto, no se asume `true` solo
 * porque la llamada HTTP tuvo éxito (un 2xx con un status inesperado se
 * trata como `unknown_status`, nunca como una cancelación silenciosa).
 */
export function mapHotelbedsCancellationResponseToCancellationResult(
  booking: HotelbedsRawCancellation,
): MapHotelbedsCancellationResponseResult {
  const statusResult = mapHotelbedsBookingStatus(booking.status ?? "");
  if (statusResult.outcome === "unknown_status") {
    return statusResult;
  }

  return {
    outcome: "success",
    result: {
      cancelled: statusResult.status === "cancelled",
      cancellationReference: booking.cancellationReference,
      status: statusResult.status,
      cancellationAmount: parseHotelbedsMonetaryAmount(booking.hotel?.cancellationAmount),
    },
  };
}
