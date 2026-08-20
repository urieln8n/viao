// Hotelbeds — Content API, operación "Hotels": GET
// /hotel-content-api/1.0/hotels. Devuelve contenido estático (nombre,
// ubicación, imágenes...) para uno o varios códigos de hotel concretos.
//
// A diferencia de availability.ts (tipos NO confirmados contra una
// respuesta real todavía), los tipos de este archivo SÍ están
// verificados contra Hotelbeds real: única petición autorizada,
// sandbox, GET .../hotels?codes=3424,168&language=CAS&fields=all (ver
// conversación). Hallazgos confirmados empíricamente que contradicen o
// completan la documentación pública:
// - La respuesta es `{ from, to, total, auditData, hotels: [...] }` —
//   `hotels` es directamente el array, NO `{hotels: {hotels: [...]}}`
//   como en la Availability API.
// - `images[].path/imageTypeCode/order/visualOrder/roomCode/roomType/
//   characteristicCode` confirmados tal cual el spec OpenAPI oficial
//   (APItudeProduct/openapi, OpenAPI-Hotel-ContentAPI-3.0.yaml).
// - `country`/`destination`/`zone` (objetos "expandidos" con nombre
//   legible) confirmado que NO vienen aunque se pida `fields=all` —
//   solo llegan los *Code planos (`countryCode`/`destinationCode`/
//   `zoneCode`). Por eso este archivo NO modela esos objetos expandidos:
//   modelarlos sería tipar un campo que Hotelbeds nunca rellena aquí.
import { getHotelbedsContent, type HotelbedsContentHttpResult } from "./content-http";

const HOTEL_CONTENT_PATH = "/hotel-content-api/1.0/hotels";

export interface HotelbedsContentRequest {
  /** Códigos de hotel Hotelbeds explícitos — este bloque no pagina ni resuelve destino, solo los hoteles fijos ya autorizados. */
  hotelCodes: number[];
  /** Código de idioma Hotelbeds (p. ej. "CAS" para castellano), ver developer.hotelbeds.com. */
  language: string;
}

/** Forma real confirmada de los campos de texto multilingüe (name/city/description/address): `{content: "..."}`. */
export interface HotelbedsContentText {
  content?: string;
}

export interface HotelbedsContentImage {
  path: string;
  imageTypeCode?: string;
  order?: number;
  visualOrder?: number;
  roomCode?: string;
  roomType?: string;
  characteristicCode?: string;
}

export interface HotelbedsContentCoordinates {
  latitude?: number;
  longitude?: number;
}

export interface HotelbedsRawContentHotel {
  code: number;
  name?: HotelbedsContentText;
  city?: HotelbedsContentText;
  countryCode?: string;
  destinationCode?: string;
  zoneCode?: number;
  postalCode?: string;
  address?: HotelbedsContentText;
  coordinates?: HotelbedsContentCoordinates;
  categoryCode?: string;
  images?: HotelbedsContentImage[];
}

export interface HotelbedsContentResponse {
  from?: number;
  to?: number;
  total?: number;
  hotels?: HotelbedsRawContentHotel[];
}

function buildContentPath(request: HotelbedsContentRequest): string {
  const params = new URLSearchParams({
    codes: request.hotelCodes.join(","),
    language: request.language,
    fields: "all",
  });
  return `${HOTEL_CONTENT_PATH}?${params.toString()}`;
}

export type HotelbedsContentTransport = (
  path: string,
) => Promise<HotelbedsContentHttpResult<HotelbedsContentResponse>>;

/**
 * `transport` inyectable solo para tests (mismo criterio que
 * fetchHotelbedsAvailability): `npm test` nunca debe llamar a Hotelbeds
 * real ni consumir cuota de sandbox. Por defecto usa `getHotelbedsContent`
 * real (sin mTLS, ver content-http.ts).
 */
export async function fetchHotelbedsContent(
  request: HotelbedsContentRequest,
  transport: HotelbedsContentTransport = getHotelbedsContent,
): Promise<HotelbedsContentHttpResult<HotelbedsContentResponse>> {
  return transport(buildContentPath(request));
}
