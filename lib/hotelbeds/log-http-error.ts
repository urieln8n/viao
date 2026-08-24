// FPR-HOTELS-COMMERCIAL-01/02 — Logging estructurado server-side de
// errores HTTP de Hotelbeds (403/429/5xx). Cierra el hueco encontrado en
// FPR-HOTELS-04: `ProviderError` ya lleva el body de Hotelbeds en
// `cause` (hotelbeds-provider.ts), pero nada lo registraba — el 403 de
// ese bloque solo se pudo diagnosticar con scripts manuales, no con
// logs. Usa `console.error` — mismo criterio que
// VIAO_ARCHITECTURE.md sección 26 ("logging nativo de la plataforma":
// Vercel captura stdout/stderr de las funciones, sin montar un stack de
// logging dedicado en el MVP).
//
// Nunca imprime API key/secret/certificado/private key/Authorization/
// X-Signature: ninguno de esos datos llega nunca hasta `body`/`cause`
// (son headers de la petición saliente, nunca del cuerpo de la
// respuesta de Hotelbeds) — pero `sanitizeHotelbedsErrorBody` redacta
// igualmente cualquier clave que PAREZCA sensible por su nombre, como
// defensa en profundidad, sin asumir una forma fija de la respuesta de
// Hotelbeds (nunca verificada contra un 403/429 real, ver FPR-HOTELS-04).

const SENSITIVE_KEY_PATTERN =
  /api[-_]?key|secret|password|token|authoriz|signature|cert|private[-_]?key|card|cvv|holder|passenger/i;

const MAX_LOGGED_BODY_LENGTH = 1000;

/**
 * Recorre `body` (la respuesta de error de Hotelbeds, forma desconocida
 * a propósito) y redacta cualquier clave cuyo NOMBRE coincida con el
 * patrón de arriba — nunca decide por el contenido del valor. Pura,
 * nunca lanza (incluida una referencia circular, vía `seen`), nunca muta
 * el `body` original.
 */
export function sanitizeHotelbedsErrorBody(body: unknown, seen = new WeakSet<object>()): unknown {
  if (body === null || typeof body !== "object") {
    return body;
  }
  if (seen.has(body)) {
    return "[circular]";
  }
  seen.add(body);
  if (Array.isArray(body)) {
    return body.map((entry) => sanitizeHotelbedsErrorBody(entry, seen));
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[REDACTED]"
      : sanitizeHotelbedsErrorBody(value, seen);
  }
  return sanitized;
}

function truncateForLog(value: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(value) ?? "undefined";
  } catch {
    text = "[cuerpo no serializable]";
  }
  return text.length > MAX_LOGGED_BODY_LENGTH
    ? `${text.slice(0, MAX_LOGGED_BODY_LENGTH)}…[truncado]`
    : text;
}

/** Endpoint LÓGICO (no la URL completa, que puede llevar query params) — suficiente para diagnosticar sin exponer más de lo necesario. */
export type HotelbedsLogEndpoint = "availability" | "checkrate" | "booking" | "cancellation";

export interface LogHotelbedsHttpErrorInput {
  endpoint: HotelbedsLogEndpoint;
  httpStatus: number;
  body: unknown;
  /** `booking_intents.client_reference`, cuando ya existe en este punto del flujo (book()) — nunca un dato inventado ni del cliente final. */
  correlationId?: string;
}

export function logHotelbedsHttpError(input: LogHotelbedsHttpErrorInput): void {
  console.error(
    JSON.stringify({
      level: "error",
      provider: "hotelbeds",
      endpoint: input.endpoint,
      httpStatus: input.httpStatus,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      body: truncateForLog(sanitizeHotelbedsErrorBody(input.body)),
      timestamp: new Date().toISOString(),
    }),
  );
}
