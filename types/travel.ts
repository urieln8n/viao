// F4-02 (VIAO_ROADMAP.md) — Tipos de dominio de viajes/hoteles.
//
// Derivados directamente de:
// - VIAO_ARCHITECTURE.md sección 9 (capacidades de HotelProvider).
// - VIAO_DATABASE.md secciones 4 (`properties`) y 6 (`bookings`).
// - VIAO_MVP_v0.1.md secciones 6 y 8 (campos de búsqueda/resultados).
//
// Estos tipos representan el DOMINIO de VIAO, independiente de cualquier
// proveedor real (ninguno se ha seleccionado todavía, MVP sección 18) y
// también independiente de la capa de persistencia (las columnas de
// `properties`/`bookings` usan snake_case; esa conversión es
// responsabilidad de quien lea/escriba Postgres, no de este contrato).
//
// `Property` representa el alojamiento normalizado que necesita el flujo
// del MVP — no un catálogo hotelero mundial propio (restricción explícita
// de la Fase 4 del roadmap: "properties es únicamente una caché mínima
// ligada a las búsquedas activas del MVP").
//
// No se instancian estos tipos contra `HotelProviderTypes` (F4-01,
// `lib/travel-provider/types.ts`) en este archivo: esa conexión concreta
// corresponde a quien implemente un proveedor (F4-04), para no adelantar
// trabajo de esa fase. F4-01 ya está preparada para recibirlos sin
// cambios, mediante su parámetro de tipo genérico.

/** Fechas en formato ISO 8601 (`YYYY-MM-DD`), igual que las columnas `date` de `searches`/`bookings`. */
type ISODateString = string;

/**
 * Búsqueda de alojamiento (VIAO_ARCHITECTURE.md sección 9: "recibir
 * destino, fechas, huéspedes y habitaciones"; MVP sección 6.2/8; columnas
 * de `searches`: `destination`, `check_in`, `check_out`, `guests`, `rooms`).
 */
export interface SearchParams {
  destination: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
  guests: number;
  rooms: number;
}

/**
 * Alojamiento normalizado (VIAO_DATABASE.md sección 4, `properties` —
 * caché normalizada de lo que devuelve `HotelProvider`; MVP sección 6.3:
 * "foto, nombre, precio, valoración, ubicación"). No incluye los campos de
 * bookkeeping propios de la caché de VIAO (`id` interno, `created_at`,
 * `updated_at`): esos pertenecen a la fila de Postgres, no al dominio del
 * proveedor.
 */
export interface Property {
  /** Identificador del `HotelProvider` de origen (`properties.provider_name`). */
  providerName: string;
  /** Id del alojamiento en el sistema del proveedor (`properties.provider_property_id`). */
  providerPropertyId: string;
  name: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  mainPhotoUrl?: string;
  /** Valoración tal como la exponga el proveedor (`properties.rating`). */
  rating?: number;
  /**
   * Copia flexible de la respuesta del proveedor (`properties.raw_data`),
   * "para no fijar un esquema rígido antes de elegir proveedor" —
   * intencionalmente sin tipar más allá de `unknown`.
   */
  raw?: unknown;
}

/** Resultados de una búsqueda: lista de alojamientos candidatos (arquitectura sección 9). */
export type SearchResults = Property[];

/** Consulta de disponibilidad para un alojamiento concreto (arquitectura sección 9). */
export interface AvailabilityQuery {
  providerPropertyId: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
  guests: number;
  rooms: number;
}

/** Resultado de disponibilidad: "confirmar si un alojamiento concreto está disponible para esas fechas". */
export interface AvailabilityResult {
  available: boolean;
}

/** Consulta de precio para la búsqueda concreta (arquitectura sección 9). */
export interface PriceQuery {
  providerPropertyId: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
  guests: number;
  rooms: number;
}

/** Precio aplicable (VIAO_DATABASE.md sección 6: `bookings.booking_value` numeric(10,2), `bookings.currency` default `'EUR'`). */
export interface PriceQuote {
  amount: number;
  currency: string;
}

/** Consulta de condiciones para un alojamiento/fechas concretos (arquitectura sección 9). */
export interface ConditionsQuery {
  providerPropertyId: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
}

/**
 * Políticas relevantes "tal como las exponga el proveedor" (arquitectura
 * sección 9 menciona explícitamente cancelación y requisitos como
 * ejemplos). Sin un formato estructurado documentado, se representan como
 * texto libre — no se inventa un esquema de negocio que ningún documento
 * define.
 */
export interface Conditions {
  cancellationPolicy?: string;
  requirements?: string;
}

/**
 * Reserva solicitada al proveedor (arquitectura sección 9: "iniciar/
 * confirmar una reserva", si el proveedor lo permite).
 */
export interface BookingRequest {
  providerPropertyId: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
  guests: number;
  rooms: number;
}

/** Mismos valores que `bookings.status` (VIAO_DATABASE.md sección 6, CHECK constraint). */
export type BookingStatus = "pending" | "confirmed" | "cancelled";

/**
 * Resultado de una reserva (VIAO_DATABASE.md sección 6:
 * `provider_booking_reference`, `status`, `booking_value`/`currency` —
 * ambos nullable "hasta tener esa información").
 */
export interface BookingResult {
  status: BookingStatus;
  providerBookingReference?: string;
  amount?: number;
  currency?: string;
}

/** Solicitud de cancelación de una reserva existente (arquitectura sección 9). */
export interface CancellationRequest {
  providerBookingReference: string;
}

/** Resultado de cancelar una reserva existente. */
export interface CancellationResult {
  cancelled: boolean;
}

/**
 * Datos de comisión (VIAO_DATABASE.md sección 6: `provider_commission`,
 * `viao_revenue`, ambos numeric(10,2) nullable "si el proveedor la
 * expone" — arquitectura sección 9).
 */
export interface Commission {
  providerCommission?: number;
  viaoRevenue?: number;
  currency?: string;
}
