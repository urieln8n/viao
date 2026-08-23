// Hotelbeds — CheckRate: POST /hotel-api/1.0/checkrates. Confirmado
// contra una respuesta REAL (única petición autorizada en FPR-04.1,
// sandbox, rateKey real de As Americas/3424, RECHECK no disponible en
// ese momento pero la respuesta BOOKABLE ya validó la forma completa) —
// a diferencia de availability.ts, este archivo SÍ está verificado
// contra Hotelbeds real, no solo contra documentación.
//
// Reutiliza `HotelbedsRawRoom`/`HotelbedsRawRate` de availability.ts:
// la respuesta real de CheckRates para `hotel.rooms[].rates[]` tiene
// exactamente la misma forma (rateKey/rateClass/rateType/net/boardCode/
// boardName/cancellationPolicies) que ya modela ese archivo — no se
// duplica el tipo.
//
// mTLS: SÍ requerido (confirmado en developer.hotelbeds.com/
// documentation/hotels/knowledge-base/mutual-authentication/, y
// verificado empíricamente en FPR-04.1 usando postHotelbeds() sin
// cambios) — por eso este archivo usa `postHotelbeds`, igual que
// availability.ts, nunca el transporte sin certificado de Content API.
import { postHotelbeds, type HotelbedsHttpResult } from "./http";
import type { HotelbedsRawRoom } from "./availability";

const CHECKRATE_PATH = "/hotel-api/1.0/checkrates";

/**
 * Confirmado real en FPR-04.1: `{ rooms: [{ rateKey }] }` — ninguna otra
 * clave. El `rateKey` se pasa tal cual, nunca transformado.
 */
export function buildHotelbedsCheckRateRequestBody(rateKeys: string[]): unknown {
  return { rooms: rateKeys.map((rateKey) => ({ rateKey })) };
}

/**
 * Solo los campos que esta resolución de rate necesita realmente —
 * `paymentDataRequired` se conserva porque ya demostró ser directamente
 * relevante (FPR-04.1) aunque este módulo no lo use todavía; el resto de
 * `hotel` (nombre, categoría, coordenadas...) no se modela aquí porque
 * nada en este bloque lo necesita — ampliarlo cuando haga falta, no antes.
 */
export interface HotelbedsCheckRateResponse {
  hotel?: {
    code?: number;
    rooms?: HotelbedsRawRoom[];
    currency?: string;
    paymentDataRequired?: boolean;
  };
}

export type HotelbedsCheckRateTransport = (
  path: string,
  body: unknown,
) => Promise<HotelbedsHttpResult<HotelbedsCheckRateResponse>>;

/**
 * `transport` inyectable solo para tests — mismo criterio que
 * `fetchHotelbedsAvailability` (availability.ts): `npm test` nunca debe
 * llamar a Hotelbeds real. Por defecto usa `postHotelbeds` real (con
 * mTLS, igual que Availability).
 */
export async function fetchHotelbedsCheckRate(
  rateKeys: string[],
  transport: HotelbedsCheckRateTransport = postHotelbeds,
): Promise<HotelbedsHttpResult<HotelbedsCheckRateResponse>> {
  return transport(CHECKRATE_PATH, buildHotelbedsCheckRateRequestBody(rateKeys));
}
