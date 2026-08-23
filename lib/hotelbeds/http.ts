// Hotelbeds — helper HTTP autenticado, generalizando el patrón ya
// verificado manualmente contra el sandbox real (status.ts, y las
// pruebas de conexión de este mismo bloque): X-Signature
// (Api-key + X-Signature + Accept) más certificado cliente mTLS
// (asociado en el dashboard de Hotelbeds a la Hotel API Key — la
// documentación de Hotelbeds exige mTLS al menos para disponibilidad/
// checkrates/confirmación/cancelación, así que se incluye siempre aquí
// en vez de solo en algunos casos).
//
// Nunca lanza: igual que lib/hotelbeds/status.ts, devuelve siempre un
// resultado tipado. Quien lo consuma (lib/hotelbeds/availability.ts, y
// más adelante checkrates/bookings) decide cómo traducir cada outcome a
// su propio modelo — por ejemplo lib/travel-provider/hotelbeds-provider.ts
// los convierte a ProviderError/ProviderUnavailableError, el mismo
// modelo de errores que ya usa MockHotelProvider.
import https from "node:https";
import { getHotelbedsClientCertificate, getHotelbedsCredentials } from "./config";
import { currentTimestampSeconds, generateHotelbedsSignature } from "./signature";

export type HotelbedsHttpResult<TBody> =
  | { outcome: "success"; httpStatus: number; body: TBody }
  | { outcome: "http_error"; httpStatus: number; body: unknown }
  | { outcome: "network_error"; message: string }
  | { outcome: "missing_credentials"; message: string }
  | { outcome: "missing_certificate"; message: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * POST/DELETE autenticado contra `${HOTELBEDS_BASE_URL}${path}`. `path`
 * debe empezar por "/" (p. ej. "/hotel-api/1.0/hotels"). `requestBody` se
 * serializa como JSON tal cual — la forma exacta del cuerpo es
 * responsabilidad de quien llama (p. ej. lib/hotelbeds/availability.ts).
 *
 * `method` (FPR-04.11, aditivo — nunca cambia el comportamiento de una
 * llamada existente: por defecto sigue siendo "POST"): la cancelación de
 * Hotelbeds (`DELETE /bookings/{bookingId}`, lib/hotelbeds/cancel.ts) no
 * lleva cuerpo, solo query params ya incluidos en `path` — por eso
 * `requestBody` puede ser `undefined`, en cuyo caso no se envían
 * `Content-Type`/`Content-Length` ni un body. Se generaliza esta única
 * función (en vez de duplicar toda la lógica de auth/mTLS/firma, ya
 * verificada contra Hotelbeds real) siguiendo el mismo criterio de "nunca
 * duplicar" ya aplicado en el resto de lib/hotelbeds/.
 */
export async function postHotelbeds<TBody = unknown>(
  path: string,
  requestBody: unknown,
  method: "POST" | "DELETE" = "POST",
): Promise<HotelbedsHttpResult<TBody>> {
  let credentials;
  try {
    credentials = getHotelbedsCredentials();
  } catch (error) {
    return {
      outcome: "missing_credentials",
      message: errorMessage(error, "Credenciales de Hotelbeds no disponibles."),
    };
  }

  let certificate;
  try {
    certificate = getHotelbedsClientCertificate();
  } catch (error) {
    return {
      outcome: "missing_certificate",
      message: errorMessage(error, "Certificado cliente de Hotelbeds no disponible."),
    };
  }

  const timestampSeconds = currentTimestampSeconds();
  const signature = generateHotelbedsSignature({
    apiKey: credentials.apiKey,
    secret: credentials.secret,
    timestampSeconds,
  });

  const target = new URL(`${credentials.baseUrl}${path}`);
  const payload = requestBody === undefined ? undefined : JSON.stringify(requestBody);

  try {
    const response = await new Promise<{ httpStatus: number; rawText: string }>(
      (resolve, reject) => {
        const req = https.request(
          {
            hostname: target.hostname,
            port: target.port || 443,
            path: `${target.pathname}${target.search}`,
            method,
            cert: certificate.cert,
            key: certificate.key,
            headers: {
              "Api-key": credentials.apiKey,
              "X-Signature": signature,
              Accept: "application/json",
              ...(payload !== undefined
                ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
                : {}),
            },
          },
          (res) => {
            let raw = "";
            res.on("data", (chunk) => (raw += chunk));
            res.on("end", () => resolve({ httpStatus: res.statusCode ?? 0, rawText: raw }));
          },
        );
        req.on("error", reject);
        if (payload !== undefined) {
          req.write(payload);
        }
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
