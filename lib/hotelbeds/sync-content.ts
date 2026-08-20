// Hotelbeds — sync manual del Content API hacia `properties` (Supabase).
// Bloque "FASE 1 — Sync Content API": una sola llamada real por
// ejecución, únicamente para los hoteles de `HOTELBEDS_FIXED_HOTEL_CODES`
// (hoy: 3424, 168) — reutiliza `getFixedHotelbedsHotelCodes()`
// (lib/travel-provider/index.ts), la misma variable que ya delimita el
// alcance de `HotelbedsProvider.search()`, sin definir una lista aparte.
//
// Deliberadamente un proceso MANUAL (runner en scripts/), no un cron: con
// solo 2 hoteles fijos no se justifica un job programado (decisión ya
// tomada en la fase de diseño de este bloque).
//
// Este archivo es el ÚNICO punto de VIAO que llama al Content API.
// `HotelbedsProvider.search()` sigue sin tocarlo — el enriquecimiento de
// Search con estos datos es un bloque posterior, todavía no autorizado.
//
// Un solo hotel ausente en la respuesta aborta todo el sync (en vez de
// guardar parcialmente los demás): mismo criterio "fail closed, nunca
// ocultar un fallo" que el resto del proyecto — con solo 2 hoteles fijos
// y controlados, una respuesta incompleta es una señal real de que algo
// no va como se espera, no un caso a tolerar en silencio.
import { getFixedHotelbedsHotelCodes } from "../travel-provider";
import { fetchHotelbedsContent, type HotelbedsContentTransport } from "./content";
import { mapHotelbedsContentHotelToProperty } from "./content-mappers";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import type { Property } from "../../types/travel";

export interface HotelbedsSyncResultRow {
  hotelCode: number;
  propertyRowId: string;
  property: Property;
}

export type HotelbedsSyncOutcome =
  | { status: "success"; results: HotelbedsSyncResultRow[] }
  | { status: "no_hotel_codes_configured" }
  | { status: "missing_credentials"; message: string }
  | { status: "network_error"; message: string }
  | { status: "http_error"; httpStatus: number; body: unknown }
  | { status: "hotel_missing_from_response"; hotelCode: number };

export interface HotelbedsSyncDependencies {
  /** Inyectable solo para tests — por defecto, getFixedHotelbedsHotelCodes real (HOTELBEDS_FIXED_HOTEL_CODES). */
  getHotelCodes?: () => number[] | undefined;
  /** Inyectable solo para tests — por defecto, getHotelbedsContent real (sin mTLS, ver content-http.ts). */
  transport?: HotelbedsContentTransport;
  /** Inyectable solo para tests — por defecto, upsertPropertyCache real (Supabase). */
  upsert?: (property: Property) => Promise<string>;
  /** Por defecto "CAS" (castellano) — mismo idioma ya usado en la única petición real autorizada de este bloque. */
  language?: string;
}

export async function syncHotelbedsContent(
  dependencies: HotelbedsSyncDependencies = {},
): Promise<HotelbedsSyncOutcome> {
  const getHotelCodes = dependencies.getHotelCodes ?? getFixedHotelbedsHotelCodes;
  const upsert = dependencies.upsert ?? upsertPropertyCache;
  const language = dependencies.language ?? "CAS";

  const hotelCodes = getHotelCodes();
  if (!hotelCodes || hotelCodes.length === 0) {
    return { status: "no_hotel_codes_configured" };
  }

  const response = await fetchHotelbedsContent({ hotelCodes, language }, dependencies.transport);

  switch (response.outcome) {
    case "missing_credentials":
      return { status: "missing_credentials", message: response.message };
    case "network_error":
      return { status: "network_error", message: response.message };
    case "http_error":
      return { status: "http_error", httpStatus: response.httpStatus, body: response.body };
    case "success":
      break;
  }

  const rawHotels = response.body.hotels ?? [];
  const results: HotelbedsSyncResultRow[] = [];

  for (const hotelCode of hotelCodes) {
    const rawHotel = rawHotels.find((entry) => entry.code === hotelCode);
    if (!rawHotel) {
      return { status: "hotel_missing_from_response", hotelCode };
    }
    const property = mapHotelbedsContentHotelToProperty(rawHotel);
    const propertyRowId = await upsert(property);
    results.push({ hotelCode, propertyRowId, property });
  }

  return { status: "success", results };
}
