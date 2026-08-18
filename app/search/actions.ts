"use server";

// F5-02 (VIAO_ROADMAP.md) — Server Action de búsqueda.
//
// Único punto de entrada server-side para ejecutar una búsqueda contra el
// `TravelProvider` activo. Una Server Action es un límite de red real (un
// cliente podría invocarla con cualquier payload, no solo el que produce el
// formulario de F5-01), así que las 6 reglas de validación de
// VIAO_DATABASE.md sección 5 (`searches`) se vuelven a comprobar aquí
// server-side, sin asumir que el cliente ya las cumplió.
//
// Encaja en la abstracción de F4-05: esta Action solo conoce
// `getTravelProvider()` (el adapter), nunca `MockHotelProvider` — así el
// resto del flujo de búsqueda es independiente de qué implementación esté
// activa, igual que el resto de VIAO.
//
// Fuera de alcance a propósito (fases posteriores del roadmap): página de
// detalle (F5-04), `search_id` en URLs/resultados/detalle (F5-07).
//
// Extensión F5-06 (documentada): crea la fila persistente en `searches`
// (VIAO_DATABASE.md sección 5) mediante `createSearchRecord()`
// (`lib/searches/create-search-record.ts`) — distinta de
// `analytics_events` (F5-05): es dato de producto (contexto de la
// recomendación de IA), no un evento. Se crea una única vez, solo en el
// camino de éxito, con `results_count` ya conocido (nunca una fila
// provisional). El `id` devuelto queda disponible en
// `SearchActionResult` para que F5-07 lo use más adelante — F5-06 NO lo
// propaga a la URL, a los resultados ni al detalle.
//
// Extensión F5-05 (documentada): registra `search_started`/
// `search_completed` (VIAO_ARCHITECTURE.md sección 10, puntos 5;
// VIAO_MVP_v0.1.md sección 13) mediante `logAnalyticsEvent()`
// (`lib/analytics/log-event.ts`) — nunca un insert directo desde aquí.
// `search_started` se registra solo tras pasar la validación server-side
// (una búsqueda "válida", como pide el criterio de F5-05), antes de llamar
// al provider. `search_completed` se registra solo si `provider.search()`
// termina con éxito (incluyendo 0 resultados) — nunca si termina en
// `provider_error`, para que ambos eventos sean distinguibles entre sí tal
// como exige F5-05. Ningún evento nuevo distinto de la taxonomía cerrada de
// `lib/analytics/events.ts`/F3-07.
//
// Extensión F5-03 (documentada, ver checkpoint de la fase): MVP sección 6
// punto 3 y el propio criterio de aceptación de F5-03 exigen mostrar
// "precio" en el listado de resultados, pero `Property` (F4-02) no incluye
// ese campo — el precio es una capacidad separada de `HotelProvider`
// (`getPrice`, F4-01, sección 9 de la arquitectura), no parte de la
// búsqueda. `getPrice` ya es una capacidad OBLIGATORIA del contrato (no
// opcional), así que no se añade ninguna capacidad nueva al provider: solo
// se compone aquí, con los mismos `checkIn`/`checkOut`/`guests`/`rooms` ya
// validados, una consulta de precio por cada resultado de `search()`. Si
// una consulta de precio individual fallara, esa propiedad se sigue
// mostrando (con precio ausente) en vez de descartar toda la búsqueda por
// un fallo puntual — no oculta un fallo del proveedor: si `search()` en sí
// falla, ese error sigue devolviéndose como `provider_error`.

import { getTravelProvider } from "../../lib/travel-provider";
import { TravelProviderError } from "../../lib/travel-provider/errors";
import { logAnalyticsEvent } from "../../lib/analytics/log-event";
import { createSearchRecord } from "../../lib/searches/create-search-record";
import { t } from "../../lib/i18n";
import type { PriceQuote, Property, SearchParams } from "../../types/travel";

export type SearchFieldErrors = Partial<Record<keyof SearchParams, string>>;

/** `Property` (F4-02) con el precio de esta búsqueda concreta compuesto aparte (ver nota F5-03 arriba). */
export interface PropertyResult extends Property {
  price?: PriceQuote;
}

export type SearchActionResult =
  | {
      status: "success";
      results: PropertyResult[];
      /** `searches.id` (F5-06) — `undefined` si no hay usuario autenticado o el insert falló (best-effort). Todavía sin propagar a F5-07. */
      searchId?: string;
    }
  | { status: "invalid_input"; fieldErrors: SearchFieldErrors }
  | { status: "provider_error"; message: string };

// Mismas 6 reglas que F5-01 valida en el cliente (ya derivadas de
// `types/travel.ts` `SearchParams` y de las CHECK constraints de
// `searches`), repetidas aquí porque el cliente no es de confianza en este
// límite. Comprobaciones de `typeof` defensivas: `SearchParams` describe el
// contrato esperado, pero en runtime un payload real puede no cumplirlo.
function validateSearchInput(input: SearchParams): SearchFieldErrors {
  const errors: SearchFieldErrors = {};

  const destination =
    typeof input?.destination === "string" ? input.destination.trim() : "";
  if (!destination) {
    errors.destination = t("search.validationDestinationRequired");
  }

  const checkIn = typeof input?.checkIn === "string" ? input.checkIn : "";
  if (!checkIn) {
    errors.checkIn = t("search.validationCheckInRequired");
  }

  const checkOut = typeof input?.checkOut === "string" ? input.checkOut : "";
  if (!checkOut) {
    errors.checkOut = t("search.validationCheckOutRequired");
  }

  if (checkIn && checkOut && !(checkOut > checkIn)) {
    errors.checkOut = t("search.validationDateRange");
  }

  const guests = typeof input?.guests === "number" ? input.guests : NaN;
  if (!(guests > 0)) {
    errors.guests = t("search.validationGuestsMin");
  }

  const rooms = typeof input?.rooms === "number" ? input.rooms : NaN;
  if (!(rooms > 0)) {
    errors.rooms = t("search.validationRoomsMin");
  }

  return errors;
}

export async function searchAction(
  input: SearchParams,
): Promise<SearchActionResult> {
  const fieldErrors = validateSearchInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid_input", fieldErrors };
  }

  const provider = getTravelProvider();
  const validatedParams: SearchParams = {
    destination: input.destination.trim(),
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    rooms: input.rooms,
  };

  await logAnalyticsEvent("search_started", { ...validatedParams });

  try {
    const properties = await provider.search(validatedParams);
    const results = await Promise.all(
      properties.map(async (property): Promise<PropertyResult> => {
        try {
          const price = await provider.getPrice({
            providerPropertyId: property.providerPropertyId,
            checkIn: validatedParams.checkIn,
            checkOut: validatedParams.checkOut,
            guests: validatedParams.guests,
            rooms: validatedParams.rooms,
          });
          return { ...property, price };
        } catch {
          return { ...property };
        }
      }),
    );

    const searchId = await createSearchRecord({
      searchParams: validatedParams,
      resultsCount: results.length,
    });

    await logAnalyticsEvent("search_completed", {
      ...validatedParams,
      resultsCount: results.length,
    });

    return { status: "success", results, searchId };
  } catch (error) {
    // Error técnico del provider (F4-03): se devuelve como resultado
    // distinguible, nunca se convierte en éxito ni se oculta. Cualquier
    // otro error (no es del modelo de F4-03) se deja propagar tal cual.
    if (error instanceof TravelProviderError) {
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }
}
