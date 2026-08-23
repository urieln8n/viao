import { getTravelProvider, type ActiveTravelProvider } from "../travel-provider";
import {
  ProviderAmbiguousError,
  ProviderUnavailableError,
  TravelProviderError,
} from "../travel-provider/errors";
import { getBookingById } from "./get-booking-by-id";
import { updateBookingStatus } from "./update-booking-status";
import type { BookingStatus } from "../../types/travel";

// FPR-04.12 — Orquestación de cancelación, backend-only (mismo criterio
// que book() en FPR-04.8: aislado de cualquier Server Action/UI todavía —
// ver la cabecera de app/booking/actions.ts para el flujo equivalente de
// creación, que una futura Server Action de cancelación debería replicar
// aquí exactamente igual que "book()" -> "createBookingAction").
//
// Nunca toca `booking_intents` (esa tabla modela la intención de CREAR
// una reserva, no de cancelarla — ver create-booking-intent.ts) ni
// `BookingRequest` (la cancelación usa `CancellationRequest`, ya
// existente desde F4-02).
//
// Regla crítica (misma que FPR-04.9 aplicó a book(), decisión confirmada
// para este bloque): si `provider.cancelBooking()` lanza
// `ProviderAmbiguousError`, `bookings.status` NO se toca — Hotelbeds
// podría haber cancelado igualmente aunque la respuesta se perdiera.
// Nunca se inventa un nuevo valor de estado para este caso (la CHECK
// constraint de `bookings.status` sigue siendo exactamente
// pending/confirmed/cancelled) — el llamador recibe un outcome
// "ambiguous" distinguible y decide qué hacer (hoy: nada automático,
// reconciliación real queda fuera de alcance, ver informe de FPR-04.12).
//
// Idempotencia propia (sin depender de ningún mecanismo nuevo): si la
// fila YA está `cancelled` en VIAO, nunca se vuelve a llamar al provider
// — evita una segunda cancelación real innecesaria para la misma reserva.
export interface CancelBookingInput {
  bookingId: string;
  userId: string;
}

export type CancelBookingResult =
  | { outcome: "cancelled"; status: BookingStatus; cancellationReference?: string }
  | { outcome: "already_cancelled" }
  | { outcome: "not_cancelled_by_provider"; status: BookingStatus | undefined }
  | { outcome: "ambiguous"; message: string }
  | { outcome: "not_found" }
  | { outcome: "missing_provider_reference" }
  | { outcome: "not_supported" }
  | { outcome: "provider_unavailable"; message: string }
  | { outcome: "provider_error"; message: string };

export interface CancelBookingDependencies {
  /** Inyectable solo para tests — por defecto, `getBookingById` real. */
  getBookingById?: typeof getBookingById;
  /** Inyectable solo para tests — por defecto, `updateBookingStatus` real. */
  updateBookingStatus?: typeof updateBookingStatus;
  /** Inyectable solo para tests — por defecto, `getTravelProvider` real (F4-05, nunca un provider concreto directamente). */
  getProvider?: () => ActiveTravelProvider;
}

export async function cancelBooking(
  input: CancelBookingInput,
  dependencies: CancelBookingDependencies = {},
): Promise<CancelBookingResult> {
  const resolveBooking = dependencies.getBookingById ?? getBookingById;
  const persistStatus = dependencies.updateBookingStatus ?? updateBookingStatus;
  const resolveProvider = dependencies.getProvider ?? getTravelProvider;

  const booking = await resolveBooking(input.bookingId, input.userId);
  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.status === "cancelled") {
    return { outcome: "already_cancelled" };
  }
  if (!booking.providerBookingReference) {
    return { outcome: "missing_provider_reference" };
  }

  const provider = resolveProvider();
  if (!provider.cancelBooking) {
    return { outcome: "not_supported" };
  }

  let result;
  try {
    result = await provider.cancelBooking({
      providerBookingReference: booking.providerBookingReference,
    });
  } catch (error) {
    if (error instanceof ProviderAmbiguousError) {
      return { outcome: "ambiguous", message: error.message };
    }
    if (error instanceof ProviderUnavailableError) {
      return { outcome: "provider_unavailable", message: error.message };
    }
    if (error instanceof TravelProviderError) {
      return { outcome: "provider_error", message: error.message };
    }
    throw error;
  }

  if (!result.cancelled) {
    // El provider respondió sin lanzar, pero el estado real devuelto NO es
    // una cancelación (p. ej. la política no lo permitía) — nunca se
    // asume éxito solo porque la llamada HTTP lo fue.
    return { outcome: "not_cancelled_by_provider", status: result.status };
  }

  const finalStatus: BookingStatus = result.status ?? "cancelled";
  await persistStatus({
    bookingId: input.bookingId,
    userId: input.userId,
    status: finalStatus,
    providerCancellationReference: result.cancellationReference,
  });

  return { outcome: "cancelled", status: finalStatus, cancellationReference: result.cancellationReference };
}
