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
 *
 * `destinationCode` (FPR-HOTELS-02): opcional y aditivo — el código de
 * destino YA resuelto en el momento en que el usuario seleccionó
 * `destination` de un catálogo real (p. ej. Hotelbeds `BCN` para
 * "Barcelona"), para que el provider no tenga que volver a resolverlo por
 * nombre. `destination` sigue siendo el dato canónico de dominio (texto
 * legible, el que persiste `searches.destination`); `destinationCode` es
 * un dato específico de proveedor que viaja junto a él solo cuando ya se
 * conoce — `MockHotelProvider` lo ignora por completo (sigue emparejando
 * por texto contra su catálogo fijo), ningún provider está obligado a
 * usarlo.
 */
export interface SearchParams {
  destination: string;
  destinationCode?: string;
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

/** Titular de la reserva (FPR-04.3 — diseño del contrato de Booking). Ambos campos obligatorios en sí mismos: Hotelbeds exige `holder.name`/`holder.surname` para reservar. */
export interface BookingHolder {
  name: string;
  surname: string;
}

/**
 * Un huésped dentro de una reserva (FPR-04.3). `roomId` es puramente
 * posicional dentro de ESTA reserva (1..`BookingRequest.rooms`), nunca un
 * id persistente — agrupa qué huéspedes comparten habitación, igual que
 * el `roomId` que espera Hotelbeds en su propio `paxes[]`. `name`/
 * `surname` quedan opcionales a nivel de tipo (Hotelbeds los trata como
 * opcionales en su schema); `age` solo es obligatorio en la práctica
 * cuando `type === "CH"` — esa regla se valida en el mapper
 * (lib/hotelbeds/booking.ts), no aquí: este tipo describe la forma del
 * dato, no sus reglas de negocio.
 */
export interface BookingPax {
  roomId: number;
  type: "AD" | "CH";
  name?: string;
  surname?: string;
  age?: number;
}

/**
 * Reserva solicitada al proveedor (arquitectura sección 9: "iniciar/
 * confirmar una reserva", si el proveedor lo permite).
 *
 * `holder`/`paxes` (FPR-04.3): opcionales a propósito, aunque Hotelbeds
 * los exija de verdad — `MockHotelProvider.book()` (F4-04) no los
 * necesita y ya tiene decenas de llamadas reales en tests que construyen
 * un `BookingRequest` sin ellos; hacerlos obligatorios aquí rompería ese
 * contrato ya probado. La obligatoriedad real para Hotelbeds se exige en
 * el mapper específico de Hotelbeds (`lib/hotelbeds/booking.ts`), no en
 * este tipo de dominio compartido por todos los providers.
 */
export interface BookingRequest {
  providerPropertyId: string;
  checkIn: ISODateString;
  checkOut: ISODateString;
  guests: number;
  rooms: number;
  holder?: BookingHolder;
  paxes?: BookingPax[];
}

/** Mismos valores que `bookings.status` (VIAO_DATABASE.md sección 6, CHECK constraint). Deliberadamente NUNCA se añade "preconfirmed" u otro valor de Hotelbeds aquí (FPR-04.3) — el mapper de Hotelbeds debe traducir a uno de estos 3 o fallar explícitamente, nunca ampliar este dominio compartido por todos los providers. */
export type BookingStatus = "pending" | "confirmed" | "cancelled";

/**
 * Resultado de una reserva (VIAO_DATABASE.md sección 6:
 * `provider_booking_reference`, `status`, `booking_value`/`currency` —
 * ambos nullable "hasta tener esa información").
 *
 * `providerCancellationReference`/`providerCost` (FPR-04.3): `amount`
 * sigue representando el precio VIAO (`booking_value`); `providerCost` es
 * el coste real del proveedor (`totalNet` de Hotelbeds), separado a
 * propósito para no mezclar "lo que cuesta" con "lo que se cobra" — sin
 * que exista todavía ningún markup real (`amount === providerCost`
 * mientras no se decida lo contrario, ver lib/hotelbeds/booking.ts).
 */
export interface BookingResult {
  status: BookingStatus;
  providerBookingReference?: string;
  providerCancellationReference?: string;
  amount?: number;
  currency?: string;
  providerCost?: number;
}

/** Solicitud de cancelación de una reserva existente (arquitectura sección 9). */
export interface CancellationRequest {
  providerBookingReference: string;
}

/**
 * Resultado de cancelar una reserva existente. `cancellationReference`/
 * `status`/`cancellationAmount` (FPR-04.11) son opcionales a propósito:
 * ningún proveedor está obligado a informarlos (el mock, por ejemplo, solo
 * necesita `cancelled`), pero Hotelbeds sí los expone en su respuesta real
 * de `DELETE /bookings/{bookingId}` — mismo criterio que
 * `BookingResult.providerCancellationReference`/`providerCost` (FPR-04.3).
 * `status` reutiliza `BookingStatus` (nunca un valor nuevo): tras cancelar
 * con éxito será `"cancelled"`, el mismo dominio compartido por todos los
 * providers.
 */
export interface CancellationResult {
  cancelled: boolean;
  cancellationReference?: string;
  status?: BookingStatus;
  cancellationAmount?: number;
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
