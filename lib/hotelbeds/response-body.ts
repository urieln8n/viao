// Hotelbeds — decodificación del cuerpo de respuesta HTTP. Compartido
// por http.ts (postHotelbeds) y content-http.ts (getHotelbedsContent):
// ambos envían `Accept-Encoding: gzip` (requisito de la revisión técnica
// de certificación de Hotelbeds, developer.hotelbeds.com — "proper use of
// GZIP compression") y deben poder recibir una respuesta comprimida o sin
// comprimir (Hotelbeds decide, el header solo es una preferencia) — nunca
// se asume un formato fijo.
//
// Pura y determinista (dado el mismo buffer + header, siempre el mismo
// resultado) — permite tests reales de la descompresión sin red, creando
// el buffer comprimido en memoria con `zlib.gzipSync`, mismo criterio que
// signature.test.ts prueba SHA-256 sin llamar a Hotelbeds.
import { gunzipSync } from "node:zlib";

/**
 * `contentEncoding` es el header `Content-Encoding` tal cual lo devuelve
 * Hotelbeds (`res.headers["content-encoding"]`) — `undefined`/cualquier
 * valor que no contenga "gzip" se trata como cuerpo sin comprimir. Nunca
 * lanza: un buffer gzip corrupto se deja pasar tal cual (como texto
 * probablemente ilegible) en vez de romper la llamada — el JSON.parse
 * posterior ya falla de forma controlada para ese caso (mismo criterio
 * que el resto de este archivo: nunca inventar, nunca ocultar un fallo
 * real, pero tampoco lanzar donde ya existe un manejo de error aguas
 * abajo).
 */
export function decodeHotelbedsResponseBuffer(
  buffer: Buffer,
  contentEncoding: string | undefined,
): string {
  const isGzip = contentEncoding?.toLowerCase().includes("gzip") ?? false;
  if (!isGzip) {
    return buffer.toString("utf8");
  }
  try {
    return gunzipSync(buffer).toString("utf8");
  } catch {
    return buffer.toString("utf8");
  }
}
