// HotelbedsProvider — implementación de HotelProvider (lib/travel-
// provider/types.ts) contra la Hotelbeds Availability API real, mismo
// patrón que MockHotelProvider (mock-provider.ts): misma clase, mismos
// tipos de dominio de types/travel.ts, mismo modelo de errores
// (lib/travel-provider/errors.ts).
//
// Deliberadamente NO implementa `book`/`cancelBooking`/`getCommission`
// (opcionales en HotelProvider) — identificados en este bloque como
// /hotel-api/1.0/checkrates y /hotel-api/1.0/bookings, pero fuera de
// alcance todavía.
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
import { ProviderError, ProviderUnavailableError } from "./errors";
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

  constructor(dependencies: HotelbedsProviderDependencies = {}) {
    this.destinationResolver =
      dependencies.destinationResolver ?? UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER;
    this.fetchAvailability = dependencies.fetchAvailability ?? fetchHotelbedsAvailability;
    this.fixedHotelCodes =
      dependencies.fixedHotelCodes && dependencies.fixedHotelCodes.length > 0
        ? dependencies.fixedHotelCodes
        : undefined;
    this.getCachedProperties = dependencies.getCachedProperties ?? getCachedProperties;
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
}
