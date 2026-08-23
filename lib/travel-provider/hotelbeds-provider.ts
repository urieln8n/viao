// HotelbedsProvider — implementación de HotelProvider (lib/travel-
// provider/types.ts) contra la Hotelbeds Availability API real, mismo
// patrón que MockHotelProvider (mock-provider.ts): misma clase, mismos
// tipos de dominio de types/travel.ts, mismo modelo de errores
// (lib/travel-provider/errors.ts).
//
// `book()` (FPR-04.8, conectado en FPR-04.9): resuelve un rateKey FRESCO
// (nunca uno de una búsqueda anterior, ver resolve-booking-rate.ts,
// FPR-04.5), construye el bookingRQ real
// (mapBookingRequestToHotelbedsBookingRQ, FPR-04.4) y llama a
// POST /hotel-api/1.0/bookings (fetchHotelbedsBooking, lib/hotelbeds/
// book.ts). `clientReference` (FPR-04.9): YA NO se genera aquí — llega
// como segundo parámetro, exactamente el `booking_intents.client_reference`
// que resolvió la capa de aplicación (app/booking/actions.ts); `book()`
// nunca lo regenera ni lo trunca de nuevo, y lanza `ProviderError` si no
// se le pasa uno (nunca reserva sin un ancla de idempotencia real). Sigue
// SIN conectar con `booking_intents`/persistencia/Puntos/referidos/Trip/
// reconciliación directamente — eso vive en app/booking/actions.ts, que
// orquesta el intent alrededor de esta llamada.
//
// Ambigüedad tras enviar /bookings (FPR-04.9, "regla crítica"): un
// `network_error` de `fetchBooking` (la conexión pudo fallar DESPUÉS de
// que Hotelbeds ya recibiera la petición) o una respuesta 2xx que no se
// puede interpretar (sin `booking`, o con un status desconocido) NUNCA se
// tratan como un rechazo — Hotelbeds podría haber creado la reserva
// igualmente. Estos casos lanzan `ProviderAmbiguousError` (en vez de
// `ProviderError`), específicamente para que quien orquesta la llamada
// (actions.ts) pueda distinguirlos y NUNCA reintentar automáticamente.
// `missing_credentials`/`missing_certificate` NO son ambiguos: fallan
// dentro de `postHotelbeds()` antes de abrir ninguna conexión (nada se
// envió nunca) — igual que `http_error`, que confirma que Hotelbeds SÍ
// respondió (un rechazo claro), no que la respuesta se perdiera.
//
// `cancelBooking()` (FPR-04.11): DELETE /hotel-api/1.0/bookings/
// {bookingId} (fetchHotelbedsCancellation, lib/hotelbeds/cancel.ts) con
// `cancellationFlag=CANCELLATION` (nunca `SIMULATION`). Mismo modelo de
// ambigüedad que `book()`: `network_error`/respuesta 2xx no interpretable
// -> `ProviderAmbiguousError`; `missing_credentials`/`missing_certificate`/
// `http_error` -> `ProviderError`. Bloque deliberadamente aislado, igual
// que `book()` lo estuvo entre FPR-04.8 y FPR-04.9: NO actualiza
// `bookings.status`/`provider_cancellation_reference` ni conecta con
// `booking_intents` — eso queda para un bloque futuro que orqueste esta
// llamada desde una Server Action, tal como `app/booking/actions.ts` ya
// hace con `book()`.
//
// Deliberadamente NO implementa `getCommission` (opcional en
// HotelProvider) — FPR-05 (VIAO_ROADMAP.md), fase separada y posterior a
// FPR-04; además FPR-04.1 ya confirmó empíricamente que esta cuenta no
// expone comisión (modelo de tarifa neta).
//
// `getDetails(propertyId)`: la Availability API exige fechas de estancia
// (no se puede consultar "este hotel" sin checkIn/checkOut) y esta ruta
// no las recibe, así que nunca vuelve a llamar a Hotelbeds — lee
// directamente de `properties` (bloque "FASE 3 — Property detail"), la
// misma caché ya poblada por el sync del Content API (lib/hotelbeds/
// sync-content.ts) y ya usada para enriquecer Search (bloque "Search ↔
// properties"). Si el hotel no está sincronizado todavía, lanza
// ProviderUnavailableError — nunca inventa datos ni intenta un fallback
// a una llamada real al Content API.
//
// `SearchParams.destination` → código de destino Hotelbeds: decisión
// explícita de este bloque — NO se resuelve automáticamente (3
// peticiones reales de investigación sin resultado concluyente, ver
// conversación). `destinationResolver` es el punto de extensión
// aislado: hoy siempre devuelve `undefined` (ver
// UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER), y `search()` falla con un
// mensaje explícito en vez de adivinar o inventar un código.
//
// Bloque "conectar HotelbedsProvider de forma controlada"
// (lib/travel-provider/index.ts): añade `fixedHotelCodes`, una segunda
// vía de entrada para `search()` con códigos de HOTEL explícitos (no de
// destino) — permite ejercitar el flujo real completo
// (Search → HotelbedsProvider → Hotelbeds → mappers → resultados) con
// los 2 códigos ya verificados con una petición real (3424, 168), sin
// haber resuelto destino→código todavía.
import type { HotelProvider, HotelProviderTypes } from "./types";
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
import {
  ProviderAmbiguousError,
  ProviderError,
  ProviderUnavailableError,
  type TravelProviderError,
} from "./errors";
import {
  fetchHotelbedsAvailability,
  type HotelbedsAvailabilityRequest,
  type HotelbedsAvailabilityScope,
  type HotelbedsRawHotel,
} from "../hotelbeds/availability";
import {
  mapHotelbedsHotelToAvailability,
  mapHotelbedsHotelToConditions,
  mapHotelbedsHotelToPriceQuote,
  mapHotelbedsHotelToProperty,
  mergePropertyWithCache,
} from "../hotelbeds/mappers";
import { getCachedProperties } from "../properties/get-cached-properties";
import {
  resolveBookableRate,
  type ResolveBookableRateResult,
} from "../hotelbeds/resolve-booking-rate";
import {
  mapBookingRequestToHotelbedsBookingRQ,
  mapHotelbedsBookingResponseToBookingResult,
} from "../hotelbeds/booking";
import { fetchHotelbedsBooking } from "../hotelbeds/book";
import { mapHotelbedsCancellationResponseToCancellationResult } from "../hotelbeds/cancellation";
import { fetchHotelbedsCancellation } from "../hotelbeds/cancel";

export interface HotelbedsProviderTypes extends HotelProviderTypes {
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

/**
 * Punto de extensión aislado para destino→código Hotelbeds (ver
 * cabecera del archivo). `undefined` = "no se pudo resolver este
 * destino" — nunca se lanza un código inventado.
 */
export type HotelbedsDestinationResolver = (destination: string) => string | undefined;

export const UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER: HotelbedsDestinationResolver = () =>
  undefined;

export interface HotelbedsProviderDependencies {
  /** Por defecto, UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER (ningún destino resuelto todavía). */
  destinationResolver?: HotelbedsDestinationResolver;
  /** Inyectable solo para tests — por defecto, fetchHotelbedsAvailability real. */
  fetchAvailability?: typeof fetchHotelbedsAvailability;
  /**
   * Códigos de hotel Hotelbeds explícitos y controlados (p. ej. desde
   * HOTELBEDS_FIXED_HOTEL_CODES, ver lib/travel-provider/index.ts). Si
   * están presentes, `search()` los usa DIRECTAMENTE y ni siquiera
   * invoca `destinationResolver` — vía de entrada temporal mientras
   * destino→código sigue sin resolverse (nunca se combinan ambas
   * fuentes: o hay códigos fijos, o se intenta resolver el destino).
   */
  fixedHotelCodes?: number[];
  /**
   * FASE 2 (bloque "Search ↔ properties") — inyectable solo para tests,
   * mismo criterio que `fetchAvailability`: por defecto,
   * `getCachedProperties` real (Supabase `service_role`, ver
   * lib/properties/get-cached-properties.ts).
   */
  getCachedProperties?: typeof getCachedProperties;
  /**
   * FPR-04.8 — inyectable solo para tests, por defecto `resolveBookableRate`
   * real (Availability fresca + CheckRates si `RECHECK`, FPR-04.5). `book()`
   * nunca reutiliza un rateKey externo: siempre pasa por aquí.
   */
  resolveRate?: typeof resolveBookableRate;
  /**
   * FPR-04.8 — inyectable solo para tests, por defecto `fetchHotelbedsBooking`
   * real (POST /hotel-api/1.0/bookings, lib/hotelbeds/book.ts).
   */
  fetchBooking?: typeof fetchHotelbedsBooking;
  /**
   * FPR-04.11 — inyectable solo para tests, por defecto
   * `fetchHotelbedsCancellation` real (DELETE /hotel-api/1.0/bookings/
   * {bookingId}, lib/hotelbeds/cancel.ts).
   */
  fetchCancellation?: typeof fetchHotelbedsCancellation;
}

function parseHotelCode(providerPropertyId: string): number {
  const code = Number(providerPropertyId);
  if (!Number.isInteger(code) || code <= 0) {
    throw new ProviderError(
      `"${providerPropertyId}" no es un código de hotel Hotelbeds válido (se espera un entero positivo).`,
    );
  }
  return code;
}

/** Igual que la constraint `CHECK (check_out > check_in)` de searches/bookings — mismo criterio que mock-provider.ts. */
function assertValidDateRange(checkIn: string, checkOut: string): void {
  const checkInDate = new Date(`${checkIn}T00:00:00Z`);
  const checkOutDate = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    throw new ProviderError(`Fecha inválida: "${checkIn}"/"${checkOut}".`);
  }
  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    throw new ProviderError("La fecha de salida debe ser posterior a la de entrada.");
  }
}

/** Igual que las constraints CHECK (guests > 0)/CHECK (rooms > 0) — mismo criterio que mock-provider.ts. */
function assertPositive(value: number, label: string): void {
  if (value <= 0) {
    throw new ProviderError(`${label} debe ser mayor que cero.`);
  }
}

export class HotelbedsProvider implements HotelProvider<HotelbedsProviderTypes> {
  private readonly destinationResolver: HotelbedsDestinationResolver;
  private readonly fetchAvailability: typeof fetchHotelbedsAvailability;
  private readonly fixedHotelCodes: number[] | undefined;
  private readonly getCachedProperties: typeof getCachedProperties;
  private readonly resolveRate: typeof resolveBookableRate;
  private readonly fetchBooking: typeof fetchHotelbedsBooking;
  private readonly fetchCancellation: typeof fetchHotelbedsCancellation;

  constructor(dependencies: HotelbedsProviderDependencies = {}) {
    this.destinationResolver =
      dependencies.destinationResolver ?? UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER;
    this.fetchAvailability = dependencies.fetchAvailability ?? fetchHotelbedsAvailability;
    this.fixedHotelCodes =
      dependencies.fixedHotelCodes && dependencies.fixedHotelCodes.length > 0
        ? dependencies.fixedHotelCodes
        : undefined;
    this.getCachedProperties = dependencies.getCachedProperties ?? getCachedProperties;
    this.resolveRate = dependencies.resolveRate ?? resolveBookableRate;
    this.fetchBooking = dependencies.fetchBooking ?? fetchHotelbedsBooking;
    this.fetchCancellation = dependencies.fetchCancellation ?? fetchHotelbedsCancellation;
  }

  /** `search()` usa códigos fijos si los hay; si no, intenta resolver el destino (nunca ambos, nunca inventa). */
  private resolveSearchScope(destination: string): HotelbedsAvailabilityScope {
    if (this.fixedHotelCodes) {
      return { type: "hotelCodes", codes: this.fixedHotelCodes };
    }
    const destinationCode = this.destinationResolver(destination);
    if (!destinationCode) {
      throw new ProviderError(
        `Sin código de destino Hotelbeds configurado para "${destination}" — la resolución destino→código está pendiente (ver bloque de investigación de códigos de destino).`,
      );
    }
    return { type: "destination", code: destinationCode };
  }

  private async requestHotels(request: HotelbedsAvailabilityRequest): Promise<HotelbedsRawHotel[]> {
    const result = await this.fetchAvailability(request);
    switch (result.outcome) {
      case "success":
        return result.body.hotels?.hotels ?? [];
      case "missing_credentials":
      case "missing_certificate":
      case "network_error":
        throw new ProviderError(result.message);
      case "http_error":
        throw new ProviderError(
          `Hotelbeds devolvió un error HTTP ${result.httpStatus}.`,
          { cause: result.body },
        );
    }
  }

  private requireHotel(hotels: HotelbedsRawHotel[], providerPropertyId: string): HotelbedsRawHotel {
    const hotel = hotels.find((entry) => String(entry.code) === providerPropertyId);
    if (!hotel) {
      throw new ProviderUnavailableError(
        `El alojamiento "${providerPropertyId}" no está disponible para esas fechas.`,
      );
    }
    return hotel;
  }

  /**
   * Traduce cada outcome de fallo de `resolveBookableRate` (FPR-04.5) al
   * modelo de errores de HotelProvider (FPR-04.3/errors.ts) — mismo
   * criterio que `requestHotels()` ya aplica a los outcomes de
   * `fetchHotelbedsAvailability`: nunca se duplica esa jerarquía, solo se
   * traduce. `no_rate_found`/`not_bookable_after_checkrate` son
   * respuestas válidas del proveedor ("esto no se puede reservar ahora
   * mismo") -> ProviderUnavailableError; el resto son fallos técnicos o
   * datos inesperados de Hotelbeds -> ProviderError.
   */
  private mapResolveRateFailureToProviderError(
    result: Exclude<ResolveBookableRateResult, { outcome: "success" }>,
  ): TravelProviderError {
    switch (result.outcome) {
      case "no_rate_found":
      case "not_bookable_after_checkrate":
        return new ProviderUnavailableError(result.message);
      case "availability_missing_credentials":
      case "availability_missing_certificate":
      case "availability_network_error":
      case "checkrate_missing_credentials":
      case "checkrate_missing_certificate":
      case "checkrate_network_error":
      case "invalid_rate_key":
      case "unknown_rate_type":
      case "checkrate_no_rate_in_response":
        return new ProviderError(result.message);
      case "availability_http_error":
      case "checkrate_http_error":
        return new ProviderError(
          `Hotelbeds devolvió un error HTTP ${result.httpStatus} al resolver la tarifa.`,
          { cause: result.body },
        );
    }
  }

  async search(params: SearchParams): Promise<Property[]> {
    assertValidDateRange(params.checkIn, params.checkOut);
    assertPositive(params.guests, "El número de huéspedes");
    assertPositive(params.rooms, "El número de habitaciones");

    const scope = this.resolveSearchScope(params.destination);

    const hotels = await this.requestHotels({
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: params.rooms,
      guests: params.guests,
      scope,
    });
    const properties = hotels.map(mapHotelbedsHotelToProperty);

    // FASE 2 (bloque "Search ↔ properties") — UNA sola consulta a
    // `properties` para toda la tanda de resultados (nunca 1 por hotel).
    // Content API NUNCA se llama desde aquí: solo se lee lo que ya
    // sincronizó lib/hotelbeds/sync-content.ts de antemano. Si un hotel
    // no está todavía en caché, `cache.get(...)` devuelve `undefined` y
    // `mergePropertyWithCache` deja ese `Property` exactamente como lo
    // dejó `mapHotelbedsHotelToProperty` — la búsqueda nunca falla ni
    // pierde resultados por falta de caché.
    const cache = await this.getCachedProperties(
      "hotelbeds",
      properties.map((property) => property.providerPropertyId),
    );
    return properties.map((property) =>
      mergePropertyWithCache(property, cache.get(property.providerPropertyId)),
    );
  }

  async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    assertValidDateRange(query.checkIn, query.checkOut);
    assertPositive(query.guests, "El número de huéspedes");
    assertPositive(query.rooms, "El número de habitaciones");

    const hotels = await this.requestHotels({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      rooms: query.rooms,
      guests: query.guests,
      scope: { type: "hotelCodes", codes: [parseHotelCode(query.providerPropertyId)] },
    });
    return mapHotelbedsHotelToAvailability(
      hotels.find((entry) => String(entry.code) === query.providerPropertyId),
    );
  }

  async getDetails(propertyId: string): Promise<Property> {
    parseHotelCode(propertyId);

    const cache = await this.getCachedProperties("hotelbeds", [propertyId]);
    const cached = cache.get(propertyId);
    if (!cached) {
      throw new ProviderUnavailableError(
        `El alojamiento "${propertyId}" no está disponible en caché/sincronizado todavía.`,
      );
    }

    return {
      providerName: "hotelbeds",
      providerPropertyId: propertyId,
      // Fallback al propio id solo para el caso límite de una fila sin
      // `name` (la columna es NOT NULL, no debería ocurrir en la
      // práctica) — mismo criterio que mapHotelbedsContentHotelToProperty
      // (lib/hotelbeds/content-mappers.ts): nunca inventa un nombre.
      name: cached.name ?? propertyId,
      city: cached.city,
      country: cached.country,
      latitude: cached.latitude,
      longitude: cached.longitude,
      mainPhotoUrl: cached.mainPhotoUrl,
      raw: cached.raw,
    };
  }

  async getPrice(query: PriceQuery): Promise<PriceQuote> {
    assertValidDateRange(query.checkIn, query.checkOut);
    assertPositive(query.guests, "El número de huéspedes");
    assertPositive(query.rooms, "El número de habitaciones");

    const hotels = await this.requestHotels({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      rooms: query.rooms,
      guests: query.guests,
      scope: { type: "hotelCodes", codes: [parseHotelCode(query.providerPropertyId)] },
    });
    const hotel = this.requireHotel(hotels, query.providerPropertyId);
    const priceQuote = mapHotelbedsHotelToPriceQuote(hotel);
    if (!priceQuote) {
      throw new ProviderUnavailableError(
        `Sin tarifa disponible para "${query.providerPropertyId}" en esas fechas.`,
      );
    }
    return priceQuote;
  }

  async getConditions(query: ConditionsQuery): Promise<Conditions> {
    assertValidDateRange(query.checkIn, query.checkOut);

    // ConditionsQuery (types/travel.ts) no lleva guests/rooms — Hotelbeds
    // exige alguna ocupación para devolver tarifas/condiciones, así que
    // se pide con 1 habitación/1 huésped (la condición de cancelación no
    // suele depender de la ocupación, a diferencia del precio). No es un
    // dato de Hotelbeds inventado, es la ocupación mínima necesaria para
    // poder hacer la consulta en absoluto.
    const hotels = await this.requestHotels({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      rooms: 1,
      guests: 1,
      scope: { type: "hotelCodes", codes: [parseHotelCode(query.providerPropertyId)] },
    });
    const hotel = this.requireHotel(hotels, query.providerPropertyId);
    return mapHotelbedsHotelToConditions(hotel);
  }

  /**
   * FPR-04.8/04.9: resuelve un rateKey FRESCO (resolveBookableRate, nunca
   * uno externo/reutilizado), construye el bookingRQ real
   * (mapBookingRequestToHotelbedsBookingRQ) con el `clientReference` YA
   * resuelto por la capa de aplicación y llama a
   * POST /hotel-api/1.0/bookings. Sigue sin conectar con
   * `booking_intents`, persistencia, Puntos, referidos, Trip ni
   * reconciliación directamente (ver cabecera del archivo) — orquestado
   * por app/booking/actions.ts.
   */
  async book(request: BookingRequest, clientReference?: string): Promise<BookingResult> {
    assertValidDateRange(request.checkIn, request.checkOut);
    assertPositive(request.guests, "El número de huéspedes");
    assertPositive(request.rooms, "El número de habitaciones");
    parseHotelCode(request.providerPropertyId);

    if (!clientReference) {
      throw new ProviderError(
        "HotelbedsProvider.book() requiere un clientReference (booking_intents.client_reference, resuelto por la capa de aplicación) — nunca genera uno internamente (FPR-04.9).",
      );
    }

    const rateResult = await this.resolveRate({
      providerPropertyId: request.providerPropertyId,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      guests: request.guests,
      rooms: request.rooms,
    });

    if (rateResult.outcome !== "success") {
      throw this.mapResolveRateFailureToProviderError(rateResult);
    }

    const mappingResult = mapBookingRequestToHotelbedsBookingRQ(
      request,
      rateResult.rateKey,
      clientReference,
    );
    if (mappingResult.outcome !== "success") {
      throw new ProviderError(mappingResult.error.message);
    }

    const httpResult = await this.fetchBooking(mappingResult.body);
    switch (httpResult.outcome) {
      case "missing_credentials":
      case "missing_certificate":
        // Falla dentro de postHotelbeds() ANTES de abrir ninguna conexión
        // — nunca se llegó a enviar nada, seguro tratarlo como un fallo
        // claro (nunca ambiguo).
        throw new ProviderError(httpResult.message);
      case "network_error":
        // FPR-04.9, regla crítica: la conexión pudo fallar DESPUÉS de que
        // Hotelbeds ya recibiera la petición — nunca se sabe con certeza.
        throw new ProviderAmbiguousError(
          `Error de red al llamar a POST /bookings — no se puede confirmar si Hotelbeds procesó la reserva: ${httpResult.message}`,
        );
      case "http_error":
        // Hotelbeds SÍ respondió (un rechazo claro), no una ambigüedad.
        throw new ProviderError(
          `Hotelbeds devolvió un error HTTP ${httpResult.httpStatus} al reservar.`,
          { cause: httpResult.body },
        );
      case "success":
        break;
    }

    const booking = httpResult.body.booking;
    if (!booking) {
      // Respuesta 2xx pero sin datos interpretables: Hotelbeds procesó
      // ALGO, pero no se puede confirmar qué — mismo criterio de
      // ambigüedad que un network_error tras el envío.
      throw new ProviderAmbiguousError(
        "Hotelbeds devolvió una respuesta 2xx sin ningún dato de booking — no se puede confirmar el resultado de la reserva.",
      );
    }

    const resultMapping = mapHotelbedsBookingResponseToBookingResult(booking);
    if (resultMapping.outcome === "unknown_status") {
      throw new ProviderAmbiguousError(
        `Hotelbeds devolvió un status de reserva no reconocido ("${resultMapping.rawStatus}") — no se puede confirmar el resultado de la reserva.`,
      );
    }

    return resultMapping.result;
  }

  /**
   * FPR-04.11 — bloque aislado, mismo criterio exacto que `book()`
   * (FPR-04.8): llama a DELETE /hotel-api/1.0/bookings/{bookingId} con
   * `providerBookingReference` (nunca `rateKey`/`clientReference`, que no
   * pertenecen a esta operación) y traduce la respuesta real. Sigue SIN
   * conectar con `bookings`/`booking_intents` (la fila persistida no se
   * actualiza a `status='cancelled'` aquí) — eso queda para un bloque
   * posterior, igual que `book()` quedó aislado de `actions.ts` entre
   * FPR-04.8 y FPR-04.9.
   */
  async cancelBooking(request: CancellationRequest): Promise<CancellationResult> {
    if (!request.providerBookingReference || request.providerBookingReference.trim() === "") {
      throw new ProviderError(
        "cancelBooking() requiere un providerBookingReference no vacío.",
      );
    }

    const httpResult = await this.fetchCancellation(request.providerBookingReference);
    switch (httpResult.outcome) {
      case "missing_credentials":
      case "missing_certificate":
        // Falla dentro de postHotelbeds() ANTES de abrir ninguna conexión
        // — nunca se llegó a enviar nada, seguro tratarlo como un fallo
        // claro (nunca ambiguo).
        throw new ProviderError(httpResult.message);
      case "network_error":
        // Mismo criterio exacto que book() (FPR-04.9, regla crítica): la
        // conexión pudo fallar DESPUÉS de que Hotelbeds ya recibiera la
        // petición de cancelación — nunca se sabe con certeza si canceló.
        throw new ProviderAmbiguousError(
          `Error de red al llamar a DELETE /bookings/{bookingId} — no se puede confirmar si Hotelbeds procesó la cancelación: ${httpResult.message}`,
        );
      case "http_error":
        // Hotelbeds SÍ respondió (un rechazo claro), no una ambigüedad.
        throw new ProviderError(
          `Hotelbeds devolvió un error HTTP ${httpResult.httpStatus} al cancelar.`,
          { cause: httpResult.body },
        );
      case "success":
        break;
    }

    const booking = httpResult.body.booking;
    if (!booking) {
      // Respuesta 2xx pero sin datos interpretables: Hotelbeds procesó
      // ALGO, pero no se puede confirmar qué — mismo criterio de
      // ambigüedad que un network_error tras el envío.
      throw new ProviderAmbiguousError(
        "Hotelbeds devolvió una respuesta 2xx sin ningún dato de booking al cancelar — no se puede confirmar el resultado.",
      );
    }

    const resultMapping = mapHotelbedsCancellationResponseToCancellationResult(booking);
    if (resultMapping.outcome === "unknown_status") {
      throw new ProviderAmbiguousError(
        `Hotelbeds devolvió un status de cancelación no reconocido ("${resultMapping.rawStatus}") — no se puede confirmar el resultado.`,
      );
    }

    return resultMapping.result;
  }
}
