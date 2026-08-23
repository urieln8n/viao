// Hotelbeds — resolución FRESCA de un rateKey reservable, bloque
// FPR-04.5. Pieza interna reutilizable por un futuro
// HotelbedsProvider.book(): NUNCA reutiliza un rateKey de una búsqueda
// anterior (Search, sesión, Supabase) — siempre vuelve a pedir
// Availability en el momento de resolver la reserva, y solo llama a
// CheckRates cuando la tarifa elegida lo exige (`rateType === "RECHECK"`,
// nunca para "BOOKABLE" — confirmado real en FPR-04.1, decisión ya
// tomada en FPR-04.3).
//
// Reutiliza sin duplicar: `fetchHotelbedsAvailability` (availability.ts,
// sin tocar), `findCheapestRate` (mappers.ts, misma política de
// selección que ya usa Search/getPrice — no se inventa una nueva),
// `fetchHotelbedsCheckRate` (checkrate.ts, nuevo en este mismo bloque).
//
// NO llama nunca a `/bookings` — este módulo termina exactamente en un
// rateKey `BOOKABLE`, nunca reserva nada.
//
// Devuelve un resultado tipado (`outcome`), nunca lanza — mismo estilo
// que `HotelbedsHttpResult`/`postHotelbeds` (la capa de abajo, esta
// función vive justo encima de esa capa): la conversión a
// `ProviderError`/`ProviderUnavailableError` (F4-03) es responsabilidad
// de quien la llame desde `HotelbedsProvider`, tal como ya hace
// `requestHotels()` con los outcomes de `fetchHotelbedsAvailability` —
// no se duplica esa jerarquía de errores aquí.
import { fetchHotelbedsAvailability, type HotelbedsAvailabilityTransport } from "./availability";
import { fetchHotelbedsCheckRate, type HotelbedsCheckRateTransport } from "./checkrate";
import { findCheapestRate } from "./mappers";

export interface ResolveBookableRateRequest {
  providerPropertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export type ResolveBookableRateResult =
  | { outcome: "success"; rateKey: string; rateType: "BOOKABLE" }
  | { outcome: "availability_missing_credentials"; message: string }
  | { outcome: "availability_missing_certificate"; message: string }
  | { outcome: "availability_network_error"; message: string }
  | { outcome: "availability_http_error"; httpStatus: number; body: unknown }
  | { outcome: "no_rate_found"; message: string }
  | { outcome: "invalid_rate_key"; message: string }
  | { outcome: "unknown_rate_type"; rateType: string | undefined; message: string }
  | { outcome: "checkrate_missing_credentials"; message: string }
  | { outcome: "checkrate_missing_certificate"; message: string }
  | { outcome: "checkrate_network_error"; message: string }
  | { outcome: "checkrate_http_error"; httpStatus: number; body: unknown }
  | { outcome: "checkrate_no_rate_in_response"; message: string }
  | { outcome: "not_bookable_after_checkrate"; rateType: string | undefined; message: string };

export interface ResolveBookableRateDependencies {
  /** Inyectable solo para tests — por defecto, el transporte real de fetchHotelbedsAvailability (postHotelbeds). */
  fetchAvailability?: HotelbedsAvailabilityTransport;
  /** Inyectable solo para tests — por defecto, el transporte real de fetchHotelbedsCheckRate (postHotelbeds). */
  fetchCheckRate?: HotelbedsCheckRateTransport;
}

/**
 * Availability fresca (nunca un rateKey antiguo) -> selección de la
 * tarifa más barata (misma política que `findCheapestRate` ya usa en
 * Search/getPrice) -> si `RECHECK`, CheckRates con ESE rateKey exacto,
 * sin transformarlo -> rateKey FINAL (el de CheckRates si se llamó, el
 * de Availability si no) siempre que termine `BOOKABLE`.
 */
export async function resolveBookableRate(
  request: ResolveBookableRateRequest,
  dependencies: ResolveBookableRateDependencies = {},
): Promise<ResolveBookableRateResult> {
  const hotelCode = Number(request.providerPropertyId);

  const availabilityResult = await fetchHotelbedsAvailability(
    {
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      rooms: request.rooms,
      guests: request.guests,
      scope: { type: "hotelCodes", codes: [hotelCode] },
    },
    dependencies.fetchAvailability,
  );

  switch (availabilityResult.outcome) {
    case "missing_credentials":
      return { outcome: "availability_missing_credentials", message: availabilityResult.message };
    case "missing_certificate":
      return { outcome: "availability_missing_certificate", message: availabilityResult.message };
    case "network_error":
      return { outcome: "availability_network_error", message: availabilityResult.message };
    case "http_error":
      return {
        outcome: "availability_http_error",
        httpStatus: availabilityResult.httpStatus,
        body: availabilityResult.body,
      };
    case "success":
      break;
  }

  const hotels = availabilityResult.body.hotels?.hotels ?? [];
  const hotel = hotels.find((entry) => String(entry.code) === request.providerPropertyId);
  const rate = hotel ? findCheapestRate(hotel) : undefined;

  if (!rate) {
    return {
      outcome: "no_rate_found",
      message: `Sin tarifas disponibles para "${request.providerPropertyId}" en esas fechas/ocupación.`,
    };
  }

  if (!rate.rateKey) {
    return {
      outcome: "invalid_rate_key",
      message: `Availability devolvió una tarifa sin rateKey para "${request.providerPropertyId}".`,
    };
  }

  if (rate.rateType === "BOOKABLE") {
    // Confirmado real en FPR-04.1: para BOOKABLE, CheckRates NUNCA se llama.
    return { outcome: "success", rateKey: rate.rateKey, rateType: "BOOKABLE" };
  }

  if (rate.rateType !== "RECHECK") {
    return {
      outcome: "unknown_rate_type",
      rateType: rate.rateType,
      message: `rateType "${rate.rateType}" no reconocido — ni "BOOKABLE" ni "RECHECK".`,
    };
  }

  // RECHECK: el rateKey de Availability se envía a CheckRates SIN
  // modificarlo (nunca reconstruido, nunca truncado).
  const checkRateResult = await fetchHotelbedsCheckRate([rate.rateKey], dependencies.fetchCheckRate);

  switch (checkRateResult.outcome) {
    case "missing_credentials":
      return { outcome: "checkrate_missing_credentials", message: checkRateResult.message };
    case "missing_certificate":
      return { outcome: "checkrate_missing_certificate", message: checkRateResult.message };
    case "network_error":
      return { outcome: "checkrate_network_error", message: checkRateResult.message };
    case "http_error":
      return {
        outcome: "checkrate_http_error",
        httpStatus: checkRateResult.httpStatus,
        body: checkRateResult.body,
      };
    case "success":
      break;
  }

  const checkedRates = (checkRateResult.body.hotel?.rooms ?? []).flatMap((room) => room.rates ?? []);
  const checkedRate = checkedRates[0];

  if (!checkedRate || !checkedRate.rateKey) {
    return {
      outcome: "checkrate_no_rate_in_response",
      message: "CheckRates no devolvió ninguna tarifa válida para el rateKey solicitado.",
    };
  }

  if (checkedRate.rateType !== "BOOKABLE") {
    // Nunca se reintenta ni se selecciona otra tarifa automáticamente —
    // resultado explícito de "no reservable", nada más.
    return {
      outcome: "not_bookable_after_checkrate",
      rateType: checkedRate.rateType,
      message: `CheckRates devolvió rateType "${checkedRate.rateType}" — no reservable.`,
    };
  }

  // Regla FPR-04.5, sección 7: el rateKey FINAL es el que devuelve
  // CheckRates (la última operación de validación), aunque sea distinto
  // del que se envió — nunca se conserva el original "por si acaso".
  return { outcome: "success", rateKey: checkedRate.rateKey, rateType: "BOOKABLE" };
}
