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
// Accept-Encoding: gzip (FPR-HOTELS-COMMERCIAL-01/02) — requisito de la
// revisión técnica de certificación de Hotelbeds ("proper use of GZIP
// compression"), mismo criterio que postHotelbeds (http.ts). La
// descompresión vive en response-body.ts (compartida por ambos
// transportes) — Hotelbeds decide si comprime o no según el header, así
// que ambos casos (con y sin Content-Encoding: gzip) deben soportarse.
import https from "node:https";
import { getHotelbedsCredentials } from "./config";
import { currentTimestampSeconds, generateHotelbedsSignature } from "./signature";
import { decodeHotelbedsResponseBuffer } from "./response-body";

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
    const response = await new Promise<{
      httpStatus: number;
      rawBuffer: Buffer;
      contentEncoding: string | undefined;
    }>((resolve, reject) => {
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
            "Accept-Encoding": "gzip",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              httpStatus: res.statusCode ?? 0,
              rawBuffer: Buffer.concat(chunks),
              contentEncoding: res.headers["content-encoding"],
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });

    const rawText = decodeHotelbedsResponseBuffer(response.rawBuffer, response.contentEncoding);
    let body: unknown;
    try {
      body = rawText ? JSON.parse(rawText) : undefined;
    } catch {
      body = rawText;
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
