"use server";

// F6-02 (VIAO_ROADMAP.md) — Server Action de reserva.
//
// Flujo: valida input server-side → resuelve usuario autenticado (mismo
// mecanismo de F3-06/F5-05/F5-06/F6-01, `lib/supabase/server.ts`; nunca se
// confía en un `user_id` enviado por el cliente) → `getTravelProvider()`
// (F4-05, nunca `MockHotelProvider` directamente) → `getDetails()` para
// confirmar que el alojamiento existe → `provider.book()` → solo si el
// provider ACEPTA la reserva, se cachea la propiedad
// (`lib/properties/upsert-property-cache.ts`) y se crea la fila en
// `bookings` (`lib/bookings/create-booking-record.ts`), ambas con
// `service_role` (Patrón B, ver auditoría en el reporte de la fase).
//
// Orden crítico: `provider.book()` se llama ANTES de tocar `bookings` —
// si el provider rechaza la reserva (`ProviderUnavailableError`) o falla
// técnicamente (`ProviderError`), NO se crea ninguna fila. La tabla nunca
// contiene una reserva "pending" que el provider ya rechazó.
//
// `status`: la fila se crea con `status: "pending"` (el propio default de
// la columna) y, F6-03 (VIAO_ROADMAP.md), se transiciona en el mismo flujo
// al estado real devuelto por `provider.book()` (`bookingResult.status`,
// "confirmed" en el mock) mediante `updateBookingStatus`
// (`lib/bookings/update-booking-status.ts`) — misma fila, sin insertar una
// segunda. No existe un camino en el que esa transición deba ser
// `cancelled`: `provider.book()` NUNCA devuelve un `BookingResult` en un
// rechazo/error, siempre lanza (`ProviderUnavailableError`/
// `ProviderError`) — y esos casos ya cortan el flujo antes de crear
// ninguna fila (ver más abajo). Auditado explícitamente contra la
// implementación real del provider activo (F4-04/F4-06) antes de
// implementar F6-03 — ver el reporte de esa fase para el detalle.
//
// Un fallo al transicionar el estado (tras una creación ya exitosa) NO
// se trata como un fallo de la reserva: la fila ya es real y válida,
// solo queda en `pending` en vez de `confirmed` — "no romper una reserva
// válida por errores secundarios" (regla explícita de F6-03). Se registra
// con `console.error` (nunca se oculta) pero la Action sigue devolviendo
// `success`.
//
// Campos económicos: `booking_value`/`currency` se rellenan con el
// importe ya devuelto por `provider.book()` (dato real de este mismo
// flujo, no inventado). `provider_commission`/`viao_revenue`/
// `reward_cost` quedan `NULL` — no se llama a `getCommission()`,
// explícitamente fuera de alcance de F6-02 (VIAO_DATABASE.md sección 6:
// "NULL hasta tener esa información").
//
// `rooms`: se usa para llamar a `provider.book()` (`BookingRequest` lo
// exige) pero NO se persiste — la tabla `bookings` no tiene columna
// `rooms` (auditado contra VIAO_DATABASE.md sección 6 y el esquema real;
// ver `lib/bookings/create-booking-record.ts` para el detalle completo).
//
// `search_id` (F6-06, VIAO_ROADMAP.md): F6-01 ya conserva `?search_id=`
// (F5-07) hasta esta pantalla, pero ese valor sigue siendo dato de
// cliente en este límite — el formato UUID por sí solo (`isValidUuid`,
// reutilizado de `app/properties/[id]/resolve.ts`, sin duplicar el regex)
// NO basta: un cliente podría enviar el UUID real de una búsqueda AJENA
// (una que existe, con formato válido, pero de otro usuario). Auditoría
// previa (Paso 0 de F6-06): `service_role` no tiene NINGÚN GRANT sobre
// `searches` (verificado con `\dp public.searches` contra Supabase local)
// — por diseño, solo el propio cliente de sesión puede leerla (Patrón A,
// `searches_select_own`, `user_id = auth.uid()`). Por eso el ownership NO
// se comprueba con una consulta manual (`.eq("user_id", ...)`) ni con
// `service_role`: se reutiliza `getSearchById()` (F6-01,
// `lib/searches/get-search-by-id.ts`), que ya usa el cliente de sesión y
// por tanto ya aplica esa RLS — si la búsqueda no existe O pertenece a
// otro usuario, devuelve `undefined` en ambos casos (indistinguibles a
// propósito, igual que en F6-05 para `bookings`), y aquí ambos se tratan
// igual: `search_id` queda `NULL`, sin crear nunca una relación falsa.
// Se resuelve DESPUÉS de confirmar `user` (más abajo) — antes de eso no
// hay ningún `auth.uid()` real con el que comparar. Si es una búsqueda
// real y propia, se guarda en `bookings.search_id` (columna ya existente,
// nullable, exactamente para este propósito) — el mismo UUID exacto,
// nunca uno nuevo generado aquí.
//
// Errores: mismo modelo de F4-03 que el resto de VIAO (F5-02/F5-04/F6-01)
// — ninguna categoría nueva. Se distinguen: input inválido,
// no autenticado, alojamiento inexistente (`getDetails()` lanza
// `ProviderUnavailableError`), reserva no disponible (`book()` lanza
// `ProviderUnavailableError`), error técnico del provider (`ProviderError`
// / `ProviderNotSupportedError`), y fallo de persistencia tras una
// reserva ya aceptada por el provider (ver
// `create-booking-record.ts`/`upsert-property-cache.ts`). Ningún error
// desconocido se oculta: se relanza tal cual, igual que en F5-02/F5-04.
//
// `booking_completed` (F6-04, VIAO_ROADMAP.md, reutiliza `logAnalyticsEvent`
// de F5-05, ningún sistema paralelo): se registra ÚNICAMENTE cuando la
// transición de F6-03 a "confirmed" tuvo éxito de verdad — ver el
// comentario junto a `statusUpdateSucceeded` más abajo. Ninguna otra rama
// de esta función (input inválido, no autenticado, alojamiento
// inexistente, no disponible, error del provider, fallo de persistencia,
// ni un fallo en la propia transición de estado) lo registra: no existe
// una conversión hasta que la fila refleja de verdad "confirmed". El
// evento de intención (`booking_clicked`, cuando el usuario pulsa
// "Reservar" en `/properties/[id]`) se registra fuera de esta Action, en
// `app/properties/[id]/log-booking-clicked-action.ts` — antes de que
// exista ningún dato de esta reserva.

import { getTravelProvider } from "../../lib/travel-provider";
import {
  ProviderNotSupportedError,
  ProviderUnavailableError,
  TravelProviderError,
} from "../../lib/travel-provider/errors";
import { createClient as createSessionClient } from "../../lib/supabase/server";
import { upsertPropertyCache } from "../../lib/properties/upsert-property-cache";
import { createBookingRecord } from "../../lib/bookings/create-booking-record";
import { updateBookingStatus } from "../../lib/bookings/update-booking-status";
import { logAnalyticsEvent } from "../../lib/analytics/log-event";
import { getSearchById } from "../../lib/searches/get-search-by-id";
import { isValidUuid } from "../properties/[id]/resolve";
import { t } from "../../lib/i18n";
import type { BookingRequest, BookingResult, Property } from "../../types/travel";

export interface BookingActionInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  searchId?: string;
}

export type BookingFieldErrors = Partial<
  Record<"propertyId" | "checkIn" | "checkOut" | "guests" | "rooms", string>
>;

export type BookingActionResult =
  | {
      status: "success";
      bookingId: string;
      providerBookingReference?: string;
    }
  | { status: "invalid_input"; fieldErrors: BookingFieldErrors }
  | { status: "unauthenticated" }
  | { status: "not_found" }
  | { status: "unavailable"; message: string }
  | { status: "provider_error"; message: string }
  | { status: "persistence_error"; message: string };

// Mismos principios que F5-02 (`app/search/actions.ts`): comprobaciones
// de `typeof` defensivas (el cliente no es de confianza en este límite),
// mismas 4 reglas de fechas/huéspedes/habitaciones que
// `BookingRequest`/`bookings` ya definen, más `propertyId` (obligatorio,
// nuevo aquí porque F6-01 nunca necesitó validarlo — llega siempre por la
// ruta). Ninguna regla de negocio adicional inventada.
function validateBookingInput(input: BookingActionInput): BookingFieldErrors {
  const errors: BookingFieldErrors = {};

  const propertyId =
    typeof input?.propertyId === "string" ? input.propertyId.trim() : "";
  if (!propertyId) {
    errors.propertyId = t("booking.validationPropertyRequired");
  }

  const checkIn = typeof input?.checkIn === "string" ? input.checkIn : "";
  if (!checkIn) {
    errors.checkIn = t("booking.validationCheckInRequired");
  }

  const checkOut = typeof input?.checkOut === "string" ? input.checkOut : "";
  if (!checkOut) {
    errors.checkOut = t("booking.validationCheckOutRequired");
  }

  if (checkIn && checkOut && !(checkOut > checkIn)) {
    errors.checkOut = t("booking.validationDateRange");
  }

  const guests = typeof input?.guests === "number" ? input.guests : NaN;
  if (!(guests > 0)) {
    errors.guests = t("booking.validationGuestsMin");
  }

  const rooms = typeof input?.rooms === "number" ? input.rooms : NaN;
  if (!(rooms > 0)) {
    errors.rooms = t("booking.validationRoomsMin");
  }

  return errors;
}

export async function createBookingAction(
  input: BookingActionInput,
): Promise<BookingActionResult> {
  const fieldErrors = validateBookingInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid_input", fieldErrors };
  }

  const propertyId = input.propertyId.trim();
  const checkIn = input.checkIn;
  const checkOut = input.checkOut;
  const guests = input.guests;
  const rooms = input.rooms;
  // Solo formato: la comprobación de propiedad (F6-06) llega más abajo,
  // una vez se conoce el usuario real.
  const rawSearchId =
    input.searchId && isValidUuid(input.searchId) ? input.searchId : undefined;

  const provider = getTravelProvider();

  // Existencia del alojamiento: comprobación de solo lectura, igual de
  // pública que /properties/[id] y /booking/[propertyId] (F5-04/F6-01,
  // ninguna de las dos exige sesión para esto) — se resuelve antes que la
  // identidad a propósito, tanto porque no es información sensible como
  // porque así falla lo más barato primero.
  let property: Property;
  try {
    property = await provider.getDetails(propertyId);
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      return { status: "not_found" };
    }
    if (error instanceof TravelProviderError) {
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }

  // Identidad: exclusivamente la sesión real del servidor — nunca un
  // `userId`/`user_id` enviado por el cliente (ese campo ni siquiera
  // existe en `BookingActionInput`). Se comprueba justo antes de la
  // primera operación con efectos reales sobre el provider (`book()`,
  // a diferencia de `getDetails()`, que es una simple lectura) — fail
  // closed: cualquier fallo al resolver la sesión (incluida la ausencia
  // de un contexto de petición real) se trata igual que "no autenticado",
  // nunca como autenticado por defecto.
  let user: { id: string } | null = null;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user: sessionUser },
    } = await sessionClient.auth.getUser();
    user = sessionUser;
  } catch {
    user = null;
  }

  if (!user) {
    return { status: "unauthenticated" };
  }

  // F6-06 — ownership: `getSearchById` usa el cliente de sesión (mismo
  // usuario ya autenticado arriba) y por tanto ya aplica
  // `searches_select_own` (RLS). Una búsqueda inexistente y una búsqueda
  // real de OTRO usuario producen el mismo `undefined` — ambas se tratan
  // igual: sin `search_id`, nunca una relación falsa.
  let searchId: string | undefined;
  if (rawSearchId) {
    const ownSearch = await getSearchById(rawSearchId);
    searchId = ownSearch ? rawSearchId : undefined;
  }

  let bookingResult: BookingResult;
  try {
    if (!provider.book) {
      throw new ProviderNotSupportedError("book");
    }
    const bookingRequest: BookingRequest = {
      providerPropertyId: propertyId,
      checkIn,
      checkOut,
      guests,
      rooms,
    };
    bookingResult = await provider.book(bookingRequest);
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      return { status: "unavailable", message: error.message };
    }
    if (error instanceof TravelProviderError) {
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }

  try {
    const propertyRowId = await upsertPropertyCache(property);
    const bookingId = await createBookingRecord({
      userId: user.id,
      propertyRowId,
      searchId,
      checkIn,
      checkOut,
      guests,
      providerBookingReference: bookingResult.providerBookingReference,
      bookingValue: bookingResult.amount,
      currency: bookingResult.currency,
    });

    // F6-03 (VIAO_ROADMAP.md) — transiciona la fila recién creada de
    // "pending" al estado real que devolvió el provider. Ver la nota de
    // cabecera: si esto falla, la reserva ya creada sigue siendo válida y
    // se reporta como éxito de todos modos (no se rompe una reserva real
    // por un error secundario), pero el fallo se registra, nunca se
    // oculta.
    let statusUpdateSucceeded = false;
    try {
      await updateBookingStatus({
        bookingId,
        userId: user.id,
        status: bookingResult.status,
      });
      statusUpdateSucceeded = true;
    } catch (statusError) {
      console.error(
        `[bookings] Reserva "${bookingId}" creada correctamente pero no se pudo transicionar su estado a "${bookingResult.status}":`,
        statusError,
      );
    }

    // F6-04 (VIAO_ROADMAP.md) — `booking_completed` representa una
    // conversión REAL: solo se registra cuando la transición de F6-03 a
    // "confirmed" tuvo éxito de verdad (`statusUpdateSucceeded`), nunca
    // por el mero hecho de que `provider.book()` respondiera o de que la
    // fila `pending` se haya creado. Si la transición falla (arriba) o el
    // provider devolviera un estado distinto de "confirmed" (no ocurre
    // con el mock actual, pero el tipo `BookingStatus` lo permite), no se
    // registra ninguna conversión falsa. `logAnalyticsEvent()` (F5-05) ya
    // es best-effort — un fallo de analytics aquí nunca deshace la
    // reserva ni cambia el resultado devuelto al usuario.
    if (statusUpdateSucceeded && bookingResult.status === "confirmed") {
      await logAnalyticsEvent("booking_completed", {
        bookingId,
        providerPropertyId: propertyId,
        ...(searchId ? { searchId } : {}),
        status: bookingResult.status,
      });
    }

    return {
      status: "success",
      bookingId,
      providerBookingReference: bookingResult.providerBookingReference,
    };
  } catch (error) {
    // El provider YA aceptó la reserva en este punto: un fallo aquí no se
    // oculta ni se convierte en éxito, pero tampoco se trata como un
    // simple "input inválido" — es un fallo de persistencia distinguible
    // (ver lib/bookings/create-booking-record.ts).
    console.error(
      "[bookings] Error inesperado persistiendo una reserva ya aceptada por el provider:",
      error,
    );
    return {
      status: "persistence_error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la reserva.",
    };
  }
}
