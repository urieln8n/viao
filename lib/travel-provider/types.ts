// F4-01 (VIAO_ROADMAP.md) — Contrato de TravelProvider/HotelProvider.
// VIAO_ARCHITECTURE.md sección 9: "El resto de VIAO no depende directamente
// de un proveedor concreto [...] TravelProvider └── HotelProvider (único
// proveedor activo en el MVP)". `HotelProvider` es la interfaz que
// cualquier proveedor concreto (mock o real) deberá implementar;
// `TravelProvider` es el alias que documenta ese diagrama — hoy son el
// mismo contrato porque el hotel es el único tipo de proveedor de viaje
// contemplado en el MVP.
//
// Esta interfaz NO incluye modelos de dominio (`Property`, `SearchParams`,
// `BookingRequest`, etc. — eso es F4-02) ni un modelo de errores (F4-03).
// Los datos de entrada/salida de cada capacidad se expresan mediante un
// parámetro de tipo genérico (`HotelProviderTypes`), `unknown` por
// defecto: el contrato queda así agnóstico de la forma real de esos datos
// hasta que F4-02 los defina y una implementación concreta (F4-04) los
// pase como argumento de tipo.

// Mapa mínimo de los tipos de entrada/salida de cada capacidad. Cada campo
// es `unknown` por defecto: F4-01 solo declara qué operación existe, no
// cómo son sus datos — eso corresponde a F4-02.
export interface HotelProviderTypes {
  searchParams: unknown;
  property: unknown;
  availabilityQuery: unknown;
  availabilityResult: unknown;
  priceQuery: unknown;
  priceQuote: unknown;
  conditionsQuery: unknown;
  conditions: unknown;
  bookingRequest: unknown;
  bookingResult: unknown;
  cancellationRequest: unknown;
  cancellationResult: unknown;
  commission: unknown;
}

/**
 * Contrato que debe implementar cualquier proveedor de alojamiento
 * concreto (mock o real), según VIAO_ARCHITECTURE.md sección 9.
 *
 * Capacidades obligatorias (todo proveedor las implementa): búsqueda,
 * disponibilidad, detalles, precio, condiciones.
 *
 * Capacidades opcionales (el proveedor puede no soportarlas — métodos
 * opcionales en la interfaz; el modelo de error para "no soportado" es
 * responsabilidad de F4-03): reserva, cancelación, comisión.
 */
export interface HotelProvider<
  T extends HotelProviderTypes = HotelProviderTypes,
> {
  /** Búsqueda: destino, fechas, huéspedes y habitaciones -> lista de alojamientos candidatos. */
  search(params: T["searchParams"]): Promise<T["property"][]>;

  /** Disponibilidad: confirma si un alojamiento concreto está disponible para esas fechas. */
  checkAvailability(
    query: T["availabilityQuery"],
  ): Promise<T["availabilityResult"]>;

  /** Detalles: información completa de un alojamiento (fotos, ubicación, características). */
  getDetails(propertyId: string): Promise<T["property"]>;

  /** Precio: precio aplicable a la búsqueda concreta. */
  getPrice(query: T["priceQuery"]): Promise<T["priceQuote"]>;

  /** Condiciones: políticas relevantes (cancelación, requisitos) tal como las exponga el proveedor. */
  getConditions(query: T["conditionsQuery"]): Promise<T["conditions"]>;

  /**
   * Reserva (opcional, "si el proveedor lo permite"): iniciar/confirmar
   * una reserva. `clientReference` (FPR-04.9, opcional a nivel de
   * contrato para no romper implementaciones/consumidores existentes que
   * no lo necesitan, p. ej. MockHotelProvider): referencia de
   * idempotencia ya resuelta por la capa de aplicación (el
   * `booking_intents.client_reference` real) — un proveedor que la
   * requiera para operar de forma segura (como HotelbedsProvider) debe
   * exigirla en su propia implementación, nunca generar una por su
   * cuenta.
   */
  book?(request: T["bookingRequest"], clientReference?: string): Promise<T["bookingResult"]>;

  /** Cancelación (opcional, "si el proveedor lo permite"): cancelar una reserva existente. */
  cancelBooking?(
    request: T["cancellationRequest"],
  ): Promise<T["cancellationResult"]>;

  /** Comisión (opcional, "si el proveedor lo expone"): datos para provider_commission/viao_revenue. */
  getCommission?(bookingResult: T["bookingResult"]): Promise<T["commission"]>;
}

/**
 * Alias documentado por VIAO_ARCHITECTURE.md sección 9: hoy
 * `TravelProvider` y `HotelProvider` son el mismo contrato porque el hotel
 * es el único tipo de proveedor de viaje del MVP.
 */
export type TravelProvider<
  T extends HotelProviderTypes = HotelProviderTypes,
> = HotelProvider<T>;
