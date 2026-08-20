// Hotelbeds — helper HTTP autenticado para el Content API: GET, SIN
// certificado cliente (mTLS). Deliberadamente un archivo separado de
// http.ts (postHotelbeds), que SIEMPRE adjunta mTLS: confirmado
// empíricamente (única petición real autorizada,
// GET .../hotel-content-api/1.0/hotels?codes=3424,168&language=CAS&fields=all
// contra sandbox, ver conversación) que el Content API responde 200 solo
// con Api-key + X-Signature, sin certificado — a diferencia del Booking
// API, donde developer.hotelbeds.com/documentation/hotels/knowledge-base/
// mutual-authentication/ exige mTLS explícitamente (availability,
// checkrate, confirmación/cancelación de reserva, etc.).
//
// Sin Accept-Encoding: mismo criterio que postHotelbeds (http.ts), que
// tampoco lo envía. Pedir "gzip" obligaría a descomprimir la respuesta
// (zlib) en este helper; sin ese header, Hotelbeds responde sin
// comprimir — más simple, y el POST equivalente ya funciona así.
import https from "node:https";
import { getHotelbedsCredentials } from "./config";
import { currentTimestampSeconds, generateHotelbedsSignature } from "./signature";

export type HotelbedsContentHttpResult<TBody> =
  | { outcome: "success"; httpStatus: number; body: TBody }
  | { outcome: "http_error"; httpStatus: number; body: unknown }
  | { outcome: "network_error"; message: string }
  | { outcome: "missing_credentials"; message: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * GET autenticado contra `${HOTELBEDS_BASE_URL}${path}`. `path` debe
 * empezar por "/" e incluir ya la query string completa (p. ej.
 * "/hotel-content-api/1.0/hotels?codes=3424,168&language=CAS&fields=all")
 * — igual que `postHotelbeds` deja la forma del body a quien llama, aquí
 * la forma de la query string es responsabilidad de quien llama
 * (lib/hotelbeds/content.ts).
 */
export async function getHotelbedsContent<TBody = unknown>(
  path: string,
): Promise<HotelbedsContentHttpResult<TBody>> {
  let credentials;
  try {
    credentials = getHotelbedsCredentials();
  } catch (error) {
    return {
      outcome: "missing_credentials",
      message: errorMessage(error, "Credenciales de Hotelbeds no disponibles."),
    };
  }

  const timestampSeconds = currentTimestampSeconds();
  const signature = generateHotelbedsSignature({
    apiKey: credentials.apiKey,
    secret: credentials.secret,
    timestampSeconds,
  });

  const target = new URL(`${credentials.baseUrl}${path}`);

  try {
    const response = await new Promise<{ httpStatus: number; rawText: string }>(
      (resolve, reject) => {
        const req = https.request(
          {
            hostname: target.hostname,
            port: target.port || 443,
            path: `${target.pathname}${target.search}`,
            method: "GET",
            headers: {
              "Api-key": credentials.apiKey,
              "X-Signature": signature,
              Accept: "application/json",
            },
          },
          (res) => {
            let raw = "";
            res.on("data", (chunk) => (raw += chunk));
            res.on("end", () => resolve({ httpStatus: res.statusCode ?? 0, rawText: raw }));
          },
        );
        req.on("error", reject);
        req.end();
      },
    );

    let body: unknown;
    try {
      body = response.rawText ? JSON.parse(response.rawText) : undefined;
    } catch {
      body = response.rawText;
    }

    if (response.httpStatus >= 200 && response.httpStatus < 300) {
      return { outcome: "success", httpStatus: response.httpStatus, body: body as TBody };
    }
    return { outcome: "http_error", httpStatus: response.httpStatus, body };
  } catch (error) {
    return {
      outcome: "network_error",
      message: errorMessage(error, "Error de red desconocido al llamar a Hotelbeds."),
    };
  }
}
