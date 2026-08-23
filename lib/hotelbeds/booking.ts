// Hotelbeds — contrato y mappers PUROS de Booking (bloque FPR-04.4).
//
// Deliberadamente sin HTTP: no importa `postHotelbeds()`, no conoce
// sesiones/Supabase/usuarios. Solo transforma/valida datos. La llamada
// real a `POST /hotel-api/1.0/bookings` y la resolución del `rateKey`
// (Availability → CheckRate si `RECHECK`) quedan fuera de este bloque —
// diseñadas en FPR-04.3, pendientes de un bloque posterior.
//
// `rateKey` entra como parámetro externo de
// `mapBookingRequestToHotelbedsBookingRQ` a propósito (FPR-04.3, sección
// 3): es un detalle interno de Hotelbeds que NUNCA debe filtrarse al
// `BookingRequest` genérico de `HotelProvider` (`MockHotelProvider` no
// tiene ningún concepto de rateKey).
import type { BookingRequest, BookingResult, BookingStatus } from "../../types/travel";

// ── BookingRQ (request) ──

export interface HotelbedsBookingRQHolder {
  name: string;
  surname: string;
}

export interface HotelbedsBookingRQPax {
  roomId: number;
  type: "AD" | "CH";
  name?: string;
  surname?: string;
  age?: number;
}

export interface HotelbedsBookingRQRoom {
  rateKey: string;
  paxes: HotelbedsBookingRQPax[];
}

/** Forma real confirmada contra el spec OpenAPI oficial (FPR-04, `bookingRQ`). */
export interface HotelbedsBookingRQ {
  holder: HotelbedsBookingRQHolder;
  rooms: HotelbedsBookingRQRoom[];
  clientReference: string;
}

/** `bookingRQ.clientReference` — `maxLength: 20` en el spec oficial (FPR-04.3, hallazgo que bloquea usar un uuid completo). */
export const HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH = 20;

export type BookingRequestValidationError =
  | { code: "missing_holder"; message: string }
  | { code: "missing_paxes"; message: string }
  | { code: "rooms_below_minimum"; message: string }
  | { code: "paxes_count_mismatch"; message: string }
  | { code: "invalid_room_id"; message: string; roomId: number }
  | { code: "missing_child_age"; message: string; paxIndex: number }
  | { code: "client_reference_too_long"; message: string; length: number };

export type MapBookingRequestResult =
  | { outcome: "success"; body: HotelbedsBookingRQ }
  | { outcome: "validation_error"; error: BookingRequestValidationError };

/**
 * `BookingRequest` (dominio VIAO) + `rateKey`/`clientReference`
 * (resueltos externamente, fuera de este bloque) -> `bookingRQ` real de
 * Hotelbeds. Nunca "arregla" un input inválido (roomId fuera de rango,
 * paxes sin encajar con guests, CH sin age, clientReference demasiado
 * larga) — falla de forma explícita y tipada en vez de redistribuir
 * pasajeros o truncar silenciosamente (FPR-04.4, reglas 6 y 7).
 *
 * `holder`/`paxes` son opcionales en `BookingRequest` (para no romper el
 * contrato ya usado por `MockHotelProvider.book()`), pero SÍ son
 * obligatorios para Hotelbeds — esa obligatoriedad se exige aquí, no en
 * el tipo de dominio compartido.
 */
export function mapBookingRequestToHotelbedsBookingRQ(
  request: BookingRequest,
  rateKey: string,
  clientReference: string,
): MapBookingRequestResult {
  if (clientReference.length > HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH) {
    return {
      outcome: "validation_error",
      error: {
        code: "client_reference_too_long",
        message: `clientReference "${clientReference}" tiene ${clientReference.length} caracteres — Hotelbeds exige un máximo de ${HOTELBEDS_CLIENT_REFERENCE_MAX_LENGTH}.`,
        length: clientReference.length,
      },
    };
  }

  if (!request.holder) {
    return {
      outcome: "validation_error",
      error: { code: "missing_holder", message: "BookingRequest.holder es obligatorio para reservar con Hotelbeds." },
    };
  }

  if (!request.paxes) {
    return {
      outcome: "validation_error",
      error: { code: "missing_paxes", message: "BookingRequest.paxes es obligatorio para reservar con Hotelbeds." },
    };
  }

  if (request.rooms < 1) {
    return {
      outcome: "validation_error",
      error: { code: "rooms_below_minimum", message: `rooms debe ser al menos 1 (recibido: ${request.rooms}).` },
    };
  }

  if (request.paxes.length !== request.guests) {
    return {
      outcome: "validation_error",
      error: {
        code: "paxes_count_mismatch",
        message: `Se esperaban ${request.guests} paxes (guests) pero se recibieron ${request.paxes.length}.`,
      },
    };
  }

  for (const pax of request.paxes) {
    if (pax.roomId < 1 || pax.roomId > request.rooms) {
      return {
        outcome: "validation_error",
        error: {
          code: "invalid_room_id",
          message: `roomId ${pax.roomId} fuera de rango — debe estar entre 1 y ${request.rooms} (rooms).`,
          roomId: pax.roomId,
        },
      };
    }
  }

  for (const [paxIndex, pax] of request.paxes.entries()) {
    if (pax.type === "CH" && pax.age === undefined) {
      return {
        outcome: "validation_error",
        error: {
          code: "missing_child_age",
          message: `El pax en la posición ${paxIndex} es type="CH" pero no informa age — Hotelbeds lo exige para menores.`,
          paxIndex,
        },
      };
    }
  }

  return {
    outcome: "success",
    body: {
      holder: { name: request.holder.name, surname: request.holder.surname },
      rooms: [
        {
          rateKey,
          // roomId se conserva exactamente tal cual llega — nunca se
          // redistribuye ni se "corrige" (FPR-04.4, regla 7).
          paxes: request.paxes.map((pax) => ({
            roomId: pax.roomId,
            type: pax.type,
            ...(pax.name !== undefined ? { name: pax.name } : {}),
            ...(pax.surname !== undefined ? { surname: pax.surname } : {}),
            ...(pax.age !== undefined ? { age: pax.age } : {}),
          })),
        },
      ],
      clientReference,
    },
  };
}

// ── BookingRS (response) ──

/** Únicamente los campos de `ApiBooking` (spec OpenAPI, FPR-04) necesarios para construir `BookingResult` — no se modelan `sellingRate`/`commission`: FPR-04.1 confirmó empíricamente que esta cuenta no los expone. */
export interface HotelbedsRawBooking {
  reference?: string;
  cancellationReference?: string;
  /** String tal cual la envía Hotelbeds ("PRECONFIRMED"/"CONFIRMED"/"CANCELLED", u otro valor no contemplado) — se valida en mapHotelbedsBookingStatus, nunca se asume aquí. */
  status?: string;
  /** String u number — FPR-04.1 confirmó empíricamente que llega como string ("243.32") pese a que el spec declara `number`. */
  totalNet?: string | number;
  currency?: string;
}

export type MapHotelbedsBookingStatusResult =
  | { outcome: "success"; status: BookingStatus }
  | { outcome: "unknown_status"; rawStatus: string };

/**
 * FPR-04.3, decisión ya adoptada: PRECONFIRMED->pending, CONFIRMED->confirmed,
 * CANCELLED->cancelled. Cualquier otro valor falla explícitamente — nunca
 * se amplía `BookingStatus` (que sigue siendo exactamente el mismo CHECK
 * de `bookings.status` en Supabase) ni se adivina un mapeo para un
 * estado no visto todavía en ninguna respuesta real.
 */
export function mapHotelbedsBookingStatus(rawStatus: string): MapHotelbedsBookingStatusResult {
  switch (rawStatus) {
    case "PRECONFIRMED":
      return { outcome: "success", status: "pending" };
    case "CONFIRMED":
      return { outcome: "success", status: "confirmed" };
    case "CANCELLED":
      return { outcome: "success", status: "cancelled" };
    default:
      return { outcome: "unknown_status", rawStatus };
  }
}

/**
 * Tolerante al formato real confirmado en FPR-04.1 ("243.32", string) y
 * al declarado por el spec (number) — nunca convierte un valor ausente o
 * inválido en `0`: devuelve `undefined`, igual que el resto de mappers
 * de Hotelbeds ya existentes (p. ej. `mapHotelbedsHotelToPriceQuote`,
 * lib/hotelbeds/mappers.ts) cuando falta un dato real.
 */
export function parseHotelbedsMonetaryAmount(value: string | number | undefined): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export type MapHotelbedsBookingResponseResult =
  | { outcome: "success"; result: BookingResult }
  | { outcome: "unknown_status"; rawStatus: string };

/**
 * `ApiBooking` real -> `BookingResult` de dominio. `providerCost` y
 * `amount` quedan con el MISMO valor (`totalNet`, sin markup) — FPR-04.3,
 * sección 9: "amount = providerCost" mientras no exista una decisión de
 * negocio de markup. Este mapper nunca calcula ni inventa un margen.
 */
export function mapHotelbedsBookingResponseToBookingResult(
  booking: HotelbedsRawBooking,
): MapHotelbedsBookingResponseResult {
  const statusResult = mapHotelbedsBookingStatus(booking.status ?? "");
  if (statusResult.outcome === "unknown_status") {
    return statusResult;
  }

  const providerCost = parseHotelbedsMonetaryAmount(booking.totalNet);

  return {
    outcome: "success",
    result: {
      status: statusResult.status,
      providerBookingReference: booking.reference,
      providerCancellationReference: booking.cancellationReference,
      providerCost,
      amount: providerCost,
      currency: booking.currency,
    },
  };
}
