// F4-03 (VIAO_ROADMAP.md) — Modelo de errores de TravelProvider/HotelProvider.
//
// Exactamente las 3 categorías que exige el criterio de aceptación del
// roadmap: no disponibilidad, error del proveedor, capacidad no soportada.
// No se añade ninguna categoría de negocio adicional.
//
// `ProviderNotSupportedError` es el modelo de error que F4-01 (
// `lib/travel-provider/types.ts`) ya anticipaba para las capacidades
// opcionales de `HotelProvider` (`book?`, `cancelBooking?`,
// `getCommission?`): "el modelo de error para 'no soportado' es
// responsabilidad de F4-03".
//
// Ningún proveedor real se ha seleccionado todavía (MVP sección 18), así
// que estos errores no incluyen ningún campo específico de un proveedor
// concreto (sin códigos HTTP, sin códigos propietarios) — solo mensaje y,
// cuando corresponda, la causa técnica original envuelta mediante el
// mecanismo estándar de `Error.cause` (ES2022).

/**
 * Clase base común a los tres tipos de error del provider. No se
 * instancia directamente (uso `abstract` a nivel de tipos, reforzado en
 * runtime más abajo): sirve para que las capas superiores puedan hacer un
 * `catch` genérico de "cualquier error de provider" con
 * `instanceof TravelProviderError`, además de distinguir el tipo concreto
 * con las subclases.
 */
export abstract class TravelProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // `abstract` de TypeScript se elimina al compilar/transpilar; esta
    // comprobación en runtime evita igualmente que se cree una instancia
    // sin un tipo concreto identificable.
    if (new.target === TravelProviderError) {
      throw new TypeError(
        "TravelProviderError es abstracta: usa ProviderUnavailableError, ProviderError o ProviderNotSupportedError.",
      );
    }
    this.name = new.target.name;
  }
}

/**
 * El alojamiento/búsqueda consultados no están disponibles (p. ej. sin
 * disponibilidad para esas fechas). Es una respuesta válida del
 * proveedor, no un fallo técnico — se distingue deliberadamente de
 * `ProviderError`.
 */
export class ProviderUnavailableError extends TravelProviderError {}

/**
 * Fallo técnico al comunicarse con el proveedor (red, respuesta
 * inesperada, error 5xx, timeout, etc.). Envuelve el error original en
 * `cause` cuando esté disponible.
 */
export class ProviderError extends TravelProviderError {}

/**
 * El proveedor activo no implementa esta capacidad. Corresponde a las
 * capacidades opcionales de `HotelProvider` (F4-01): reserva,
 * cancelación, comisión — "si el proveedor lo permite/expone"
 * (VIAO_ARCHITECTURE.md sección 9).
 */
export class ProviderNotSupportedError extends TravelProviderError {
  /** Nombre del método opcional no soportado (p. ej. `"book"`, `"cancelBooking"`, `"getCommission"`). */
  readonly capability: string;

  constructor(
    capability: string,
    message?: string,
    options?: { cause?: unknown },
  ) {
    super(
      message ??
        `La capacidad "${capability}" no está soportada por el proveedor activo.`,
      options,
    );
    this.capability = capability;
  }
}
