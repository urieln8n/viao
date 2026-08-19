// Hotelbeds — prueba de conexión sandbox. Algoritmo de X-Signature según
// la documentación oficial de Hotelbeds (developer.hotelbeds.com):
// SHA-256 en hexadecimal de la concatenación literal apiKey + secret +
// timestamp (segundos Unix, UTC). Es un hash simple, no HMAC — confirmado
// contra los ejemplos oficiales en bash/Python de Hotelbeds
// (`sha256sum` / `hashlib.sha256(...).hexdigest()` sobre la cadena
// concatenada, ninguno usa una clave HMAC separada).
//
// `timestampSeconds` se recibe como parámetro (no se llama a Date.now()
// dentro de esta función) para que la firma sea pura y determinista en
// los tests — mismo criterio que el resto de VIAO evita mezclar E/S o
// tiempo real con lógica pura.
import { createHash } from "node:crypto";

export interface HotelbedsSignatureInput {
  apiKey: string;
  secret: string;
  timestampSeconds: number;
}

export function generateHotelbedsSignature({
  apiKey,
  secret,
  timestampSeconds,
}: HotelbedsSignatureInput): string {
  return createHash("sha256")
    .update(`${apiKey}${secret}${timestampSeconds}`)
    .digest("hex");
}

export function currentTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
