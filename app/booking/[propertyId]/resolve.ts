// F6-01 (VIAO_ROADMAP.md) — Resolución del contexto de la pantalla de
// confirmación de reserva.
//
// Mismo patrón que app/properties/[id]/resolve.ts (F5-04): lógica testable
// con `node:test`, separada de `page.tsx`. Único punto que conoce
// `getTravelProvider()` para esta pantalla — nunca `MockHotelProvider`
// directamente.
//
// Alcance estrictamente de F6-01: solo lectura. Se llama a
// `getDetails()` (obligatoria, F4-01) y, opcionalmente, a `getPrice()`
// (también obligatoria, ya usada así en F5-03) — nunca a `book()`. No se
// crea ninguna fila en `bookings`, no existe todavía ninguna Server Action
// de reserva (`app/booking/actions.ts` es F6-02, no esta fase).
//
// `search_id` (F5-07): se valida como UUID (reutilizando `isValidUuid` de
// app/properties/[id]/resolve.ts, sin duplicar el regex) — si no tiene
// formato válido, se trata como ausente, nunca provoca una excepción.
//
// Precarga best-effort de fechas/huéspedes/habitaciones y precio "si
// vienen disponibles desde el flujo anterior" (instrucción explícita de
// F6-01): cuando el `search_id` es válido, se lee la fila propia de
// `searches` (`lib/searches/get-search-by-id.ts`, F6-01, respeta RLS
// Patrón A — nunca `service_role`) y, si existe, se usa para precargar el
// formulario y componer un precio de referencia con `getPrice()` (mismos
// `checkIn`/`checkOut`/`guests`/`rooms` de esa búsqueda). Si el
// `search_id` no llega, no es válido, no corresponde a una búsqueda propia
// o el precio falla, la pantalla sigue funcionando con normalidad — solo
// sin precarga ni precio, exactamente como una visita directa sin
// `search_id` (compatibilidad con F5-04).
//
// Errores: mismo modelo de F4-03 que F5-04 — `ProviderUnavailableError`
// (alojamiento inexistente) se interpreta como "no encontrado" (se
// traduce a `notFound()` en la página); cualquier otro
// `TravelProviderError` es un fallo técnico distinguible; cualquier otro
// error se relanza sin ocultarlo.

import { getTravelProvider } from "../../../lib/travel-provider";
import {
  ProviderUnavailableError,
  TravelProviderError,
} from "../../../lib/travel-provider/errors";
import { getSearchById } from "../../../lib/searches/get-search-by-id";
import { isValidUuid } from "../../properties/[id]/resolve";
import type { PriceQuote, Property } from "../../../types/travel";

export interface BookingPrefill {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export interface BookingContext {
  property: Property;
  searchId?: string;
  prefill?: BookingPrefill;
  price?: PriceQuote;
}

export type BookingPageResult =
  | { status: "found"; context: BookingContext }
  | { status: "not_found" }
  | { status: "provider_error"; message: string };

/** Mismo mapeo que `classifyDetailError` de F5-04 (modelo de errores de F4-03, sin categorías nuevas), extraído para ser testable de forma aislada. */
export function classifyBookingError(
  error: unknown,
): { status: "not_found" } | { status: "provider_error"; message: string } {
  if (error instanceof ProviderUnavailableError) {
    return { status: "not_found" };
  }
  if (error instanceof TravelProviderError) {
    return { status: "provider_error", message: error.message };
  }
  throw error;
}

export async function resolveBookingContext(
  propertyId: string,
  rawSearchId?: string,
): Promise<BookingPageResult> {
  const provider = getTravelProvider();
  const searchId =
    rawSearchId && isValidUuid(rawSearchId) ? rawSearchId : undefined;

  try {
    const property = await provider.getDetails(propertyId);

    let prefill: BookingPrefill | undefined;
    let price: PriceQuote | undefined;

    if (searchId) {
      const search = await getSearchById(searchId);
      if (search) {
        prefill = {
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guests: search.guests,
          rooms: search.rooms,
        };

        try {
          price = await provider.getPrice({
            providerPropertyId: propertyId,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            guests: search.guests,
            rooms: search.rooms,
          });
        } catch {
          // Precio de referencia best-effort: si falla, simplemente no se
          // muestra — no es la operación principal de esta pantalla.
        }
      }
    }

    return { status: "found", context: { property, searchId, prefill, price } };
  } catch (error) {
    return classifyBookingError(error);
  }
}
