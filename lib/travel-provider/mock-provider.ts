// F4-04 (VIAO_ROADMAP.md) — MockHotelProvider.
//
// Implementa el contrato completo de `HotelProvider` (F4-01,
// `lib/travel-provider/types.ts`) usando los tipos de dominio de F4-02
// (`types/travel.ts`) y el modelo de errores de F4-03
// (`lib/travel-provider/errors.ts`), con datos ficticios, deterministas y
// estables (VIAO_ARCHITECTURE.md sección 9). Sin red, sin base de datos,
// sin credenciales, sin ningún proveedor real: todo el estado vive en
// memoria, dentro de esta clase.
//
// Coherencia entre operaciones: todas las capacidades leen del mismo
// catálogo fijo (`PROPERTY_STATE`), indexado por `providerPropertyId` —
// una propiedad devuelta por `search()` es consultable con ese mismo id
// en disponibilidad/detalle/precio/condiciones. El precio se calcula con
// una fórmula pura (sin aleatoriedad ni reloj), así que es reproducible:
// la misma consulta siempre devuelve el mismo resultado. Una reserva solo
// puede cancelarse si su referencia corresponde a una reserva creada
// realmente por `book()`.

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

/**
 * Instancia concreta de `HotelProviderTypes` (F4-01) usando los tipos de
 * dominio de F4-02 — la conexión entre el contrato genérico y los datos
 * reales de VIAO que F4-02 dejó pendiente intencionadamente para esta
 * fase (F4-04).
 */
export interface MockHotelProviderTypes extends HotelProviderTypes {
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

interface MockPropertyState {
  readonly property: Property;
  readonly roomsAvailable: number;
  readonly basePricePerNight: number;
  /**
   * F4-06 (VIAO_ROADMAP.md) — incremento fijo, en la misma moneda, que se
   * suma al precio base por cada consulta de precio ya realizada para
   * este alojamiento (ver `nextPriceQueryOrdinal`). `0` para el resto del
   * catálogo: su precio permanece exactamente igual en cualquier número
   * de consultas, sin cambio de comportamiento respecto a F4-04. Es una
   * cuenta de llamadas, no un reloj ni aleatoriedad — determinista y
   * reproducible dado un orden de llamadas conocido.
   */
  readonly priceDriftPerQuery: number;
  readonly currency: string;
  readonly conditions: Conditions;
}

interface MockBooking {
  status: BookingResult["status"];
  amount: number;
  currency: string;
}

// Catálogo ficticio, fijo y estable (arquitectura sección 9; Fase 4 del
// roadmap: "properties es únicamente una caché mínima... no un catálogo
// autónomo" — 3 alojamientos bastan para demostrar el contrato completo,
// no un inventario real). Mercado inicial España (MVP sección 3).
const PROPERTY_STATE: readonly MockPropertyState[] = [
  {
    property: {
      providerName: "mock",
      providerPropertyId: "mock-001",
      name: "Hotel Central Madrid",
      city: "Madrid",
      country: "España",
      latitude: 40.4168,
      longitude: -3.7038,
      mainPhotoUrl: "https://mock-provider.local/photos/mock-001.jpg",
      rating: 4.2,
    },
    roomsAvailable: 5,
    basePricePerNight: 90,
    priceDriftPerQuery: 0,
    currency: "EUR",
    conditions: {
      cancellationPolicy:
        "Cancelación gratuita hasta 48 horas antes de la llegada.",
      requirements:
        "Se requiere tarjeta de crédito válida para garantizar la reserva.",
    },
  },
  {
    property: {
      providerName: "mock",
      providerPropertyId: "mock-002",
      name: "Hostal Barceloneta",
      city: "Barcelona",
      country: "España",
      latitude: 41.3809,
      longitude: 2.1901,
      mainPhotoUrl: "https://mock-provider.local/photos/mock-002.jpg",
      rating: 3.8,
    },
    roomsAvailable: 3,
    basePricePerNight: 65,
    priceDriftPerQuery: 0,
    currency: "EUR",
    conditions: {
      cancellationPolicy: "No reembolsable.",
      requirements: "Check-in a partir de las 15:00.",
    },
  },
  {
    property: {
      providerName: "mock",
      providerPropertyId: "mock-003",
      name: "Boutique Casco Antiguo",
      city: "Sevilla",
      country: "España",
      latitude: 37.3891,
      longitude: -5.9845,
      mainPhotoUrl: "https://mock-provider.local/photos/mock-003.jpg",
      rating: 4.6,
    },
    roomsAvailable: 1,
    basePricePerNight: 120,
    priceDriftPerQuery: 0,
    currency: "EUR",
    conditions: {
      cancellationPolicy:
        "Cancelación gratuita hasta 7 días antes de la llegada.",
      requirements: "Edad mínima del titular de la reserva: 21 años.",
    },
  },
  {
    // F4-06 — alojamiento dedicado al escenario "cambio de precio entre
    // búsqueda y reserva": su precio sube un importe fijo en cada
    // consulta ya realizada (`priceDriftPerQuery`), así que una primera
    // llamada (fase de búsqueda) y una segunda llamada posterior (fase
    // de reserva) devuelven, de forma determinista, importes distintos.
    property: {
      providerName: "mock",
      providerPropertyId: "mock-004",
      name: "Apartamentos Turia",
      city: "Valencia",
      country: "España",
      latitude: 39.4699,
      longitude: -0.3763,
      mainPhotoUrl: "https://mock-provider.local/photos/mock-004.jpg",
      rating: 4.0,
    },
    roomsAvailable: 4,
    basePricePerNight: 100,
    priceDriftPerQuery: 20,
    currency: "EUR",
    conditions: {
      cancellationPolicy:
        "Cancelación gratuita hasta 24 horas antes de la llegada.",
      requirements: "Depósito de garantía reembolsable de 50€.",
    },
  },
];

export interface KnownDestination {
  city: string;
  country: string;
}

/**
 * Bloque 16 ("Destinos seleccionables") — deriva la lista de destinos del
 * MISMO catálogo que `search()` ya usa (`PROPERTY_STATE`), en vez de
 * mantener una lista separada que podría desincronizarse. Deduplicada por
 * `city` (los 4 alojamientos del mock cubren 4 ciudades distintas, una
 * cada una, pero esto sigue siendo correcto si en el futuro hubiera más de
 * un alojamiento por ciudad). NO cambia ni depende de `search()`: es
 * puramente informativa, para que la UI pueda sugerir destinos válidos sin
 * inventar ninguno nuevo.
 */
export function listKnownDestinations(): KnownDestination[] {
  const seen = new Set<string>();
  const destinations: KnownDestination[] = [];
  for (const { property } of PROPERTY_STATE) {
    if (!property.city || seen.has(property.city)) {
      continue;
    }
    seen.add(property.city);
    destinations.push({ city: property.city, country: property.country ?? "" });
  }
  return destinations;
}

// Porcentaje de comisión ilustrativo, únicamente para este mock. La
// economía real de comisiones sigue sin decidirse (MVP sección 18, punto
// 1) — este valor NO representa ninguna decisión de negocio.
const MOCK_COMMISSION_RATE = 0.1;

function findPropertyState(
  providerPropertyId: string,
): MockPropertyState | undefined {
  return PROPERTY_STATE.find(
    (entry) => entry.property.providerPropertyId === providerPropertyId,
  );
}

function requirePropertyState(providerPropertyId: string): MockPropertyState {
  const state = findPropertyState(providerPropertyId);
  if (!state) {
    throw new ProviderUnavailableError(
      `El alojamiento "${providerPropertyId}" no existe o no está disponible.`,
    );
  }
  return state;
}

function parseISODate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ProviderError(`Fecha inválida: "${value}".`);
  }
  return date;
}

/** Igual que la constraint `CHECK (check_out > check_in)` de `searches`/`bookings`. */
function assertValidDateRange(
  checkIn: string,
  checkOut: string,
): { nights: number } {
  const checkInDate = parseISODate(checkIn);
  const checkOutDate = parseISODate(checkOut);

  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    throw new ProviderError(
      "La fecha de salida debe ser posterior a la de entrada.",
    );
  }

  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  return { nights };
}

/** Igual que las constraints `CHECK (guests > 0)`/`CHECK (rooms > 0)` de `searches`/`bookings`. */
function assertPositive(value: number, label: string): void {
  if (value <= 0) {
    throw new ProviderError(`${label} debe ser mayor que cero.`);
  }
}

/**
 * `queryOrdinal` es el número de orden (1-indexado) de esta consulta de
 * precio para esta propiedad, dentro de la misma instancia del provider
 * (ver `nextPriceQueryOrdinal`). Para el catálogo estándar
 * (`priceDriftPerQuery = 0`) el resultado es idéntico sea cual sea el
 * ordinal — sigue siendo puro y reproducible, igual que en F4-04.
 */
function calculatePrice(
  state: MockPropertyState,
  nights: number,
  rooms: number,
  queryOrdinal: number,
): PriceQuote {
  const effectiveBasePrice =
    state.basePricePerNight + state.priceDriftPerQuery * (queryOrdinal - 1);
  return {
    amount: Math.round(effectiveBasePrice * nights * rooms * 100) / 100,
    currency: state.currency,
  };
}

/**
 * Proveedor ficticio de alojamiento. Implementa las 8 capacidades de
 * `HotelProvider` (F4-01) con datos deterministas en memoria.
 */
export class MockHotelProvider
  implements HotelProvider<MockHotelProviderTypes>
{
  private readonly bookings = new Map<string, MockBooking>();
  private nextBookingSequence = 1;
  private readonly priceQueryCounts = new Map<string, number>();

  /** F4-06 — cuenta cuántas veces se ha consultado el precio de esta propiedad (búsqueda, reserva, etc.), en esta misma instancia. */
  private nextPriceQueryOrdinal(providerPropertyId: string): number {
    const next = (this.priceQueryCounts.get(providerPropertyId) ?? 0) + 1;
    this.priceQueryCounts.set(providerPropertyId, next);
    return next;
  }

  async search(params: SearchParams): Promise<Property[]> {
    assertValidDateRange(params.checkIn, params.checkOut);
    assertPositive(params.guests, "El número de huéspedes");
    assertPositive(params.rooms, "El número de habitaciones");

    const needle = params.destination.trim().toLowerCase();
    return PROPERTY_STATE.filter(({ property }) =>
      [property.city, property.country, property.name]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle)),
    ).map(({ property }) => ({ ...property }));
  }

  async checkAvailability(
    query: AvailabilityQuery,
  ): Promise<AvailabilityResult> {
    assertValidDateRange(query.checkIn, query.checkOut);
    assertPositive(query.guests, "El número de huéspedes");
    assertPositive(query.rooms, "El número de habitaciones");

    const state = requirePropertyState(query.providerPropertyId);
    return { available: query.rooms <= state.roomsAvailable };
  }

  async getDetails(propertyId: string): Promise<Property> {
    const state = requirePropertyState(propertyId);
    return { ...state.property };
  }

  async getPrice(query: PriceQuery): Promise<PriceQuote> {
    const { nights } = assertValidDateRange(query.checkIn, query.checkOut);
    assertPositive(query.guests, "El número de huéspedes");
    assertPositive(query.rooms, "El número de habitaciones");

    const state = requirePropertyState(query.providerPropertyId);
    const ordinal = this.nextPriceQueryOrdinal(query.providerPropertyId);
    return calculatePrice(state, nights, query.rooms, ordinal);
  }

  async getConditions(query: ConditionsQuery): Promise<Conditions> {
    assertValidDateRange(query.checkIn, query.checkOut);

    const state = requirePropertyState(query.providerPropertyId);
    return { ...state.conditions };
  }

  async book(request: BookingRequest): Promise<BookingResult> {
    const { nights } = assertValidDateRange(request.checkIn, request.checkOut);
    assertPositive(request.guests, "El número de huéspedes");
    assertPositive(request.rooms, "El número de habitaciones");

    const state = requirePropertyState(request.providerPropertyId);
    if (request.rooms > state.roomsAvailable) {
      throw new ProviderUnavailableError(
        `No hay disponibilidad suficiente en "${request.providerPropertyId}" para ${request.rooms} habitación(es).`,
      );
    }

    const ordinal = this.nextPriceQueryOrdinal(request.providerPropertyId);
    const { amount, currency } = calculatePrice(
      state,
      nights,
      request.rooms,
      ordinal,
    );
    const providerBookingReference = `mock-booking-${this.nextBookingSequence++}`;

    this.bookings.set(providerBookingReference, {
      status: "confirmed",
      amount,
      currency,
    });

    return { status: "confirmed", providerBookingReference, amount, currency };
  }

  async cancelBooking(
    request: CancellationRequest,
  ): Promise<CancellationResult> {
    const booking = this.bookings.get(request.providerBookingReference);
    if (!booking) {
      throw new ProviderUnavailableError(
        `La reserva "${request.providerBookingReference}" no existe.`,
      );
    }

    booking.status = "cancelled";
    return { cancelled: true };
  }

  async getCommission(bookingResult: BookingResult): Promise<Commission> {
    if (bookingResult.amount === undefined) {
      throw new ProviderError(
        "No se puede calcular la comisión sin un importe de reserva conocido.",
      );
    }

    const providerCommission =
      Math.round(bookingResult.amount * MOCK_COMMISSION_RATE * 100) / 100;

    return {
      providerCommission,
      viaoRevenue: providerCommission,
      currency: bookingResult.currency ?? "EUR",
    };
  }
}
