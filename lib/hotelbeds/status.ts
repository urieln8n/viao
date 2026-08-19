// Hotelbeds — prueba de conectividad mínima (sandbox). Llama únicamente
// a GET /hotel-api/1.0/status para confirmar que las credenciales y la
// firma funcionan. NO implementa el contrato HotelProvider
// (lib/travel-provider/types.ts) — eso es una fase posterior, deliberada
// y explícitamente fuera de alcance aquí. Este módulo no sabe nada de
// búsqueda de hoteles, disponibilidad, precio ni reservas.
//
// Nunca lanza: devuelve siempre un resultado tipado para que quien lo
// llame pueda decidir qué hacer sin necesitar un try/catch, y para que
// ningún caller termine logueando accidentalmente un stack trace que
// mencione las credenciales (que en ningún caso aparecen en los mensajes
// de error de este módulo — ver lib/hotelbeds/config.ts).
import { getHotelbedsCredentials } from "./config";
import { currentTimestampSeconds, generateHotelbedsSignature } from "./signature";

const STATUS_PATH = "/hotel-api/1.0/status";

export type HotelbedsStatusResult =
  | { outcome: "success"; httpStatus: number; body: unknown }
  | { outcome: "http_error"; httpStatus: number; body: unknown }
  | { outcome: "network_error"; message: string }
  | { outcome: "missing_credentials"; message: string };

export async function checkHotelbedsStatus(): Promise<HotelbedsStatusResult> {
  let credentials;
  try {
    credentials = getHotelbedsCredentials();
  } catch (error) {
    return {
      outcome: "missing_credentials",
      message:
        error instanceof Error
          ? error.message
          : "Credenciales de Hotelbeds no disponibles.",
    };
  }

  const timestampSeconds = currentTimestampSeconds();
  const signature = generateHotelbedsSignature({
    apiKey: credentials.apiKey,
    secret: credentials.secret,
    timestampSeconds,
  });

  try {
    const response = await fetch(`${credentials.baseUrl}${STATUS_PATH}`, {
      method: "GET",
      headers: {
        "Api-key": credentials.apiKey,
        "X-Signature": signature,
        Accept: "application/json",
      },
    });

    const body: unknown = await response.json().catch(() => undefined);

    return response.ok
      ? { outcome: "success", httpStatus: response.status, body }
      : { outcome: "http_error", httpStatus: response.status, body };
  } catch (error) {
    return {
      outcome: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "Error de red desconocido al llamar a Hotelbeds.",
    };
  }
}
