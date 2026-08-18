// F5-04 (VIAO_ROADMAP.md) — Resolución del detalle de un alojamiento.
//
// Separado de `page.tsx` por el mismo motivo que `app/search/results/
// format.ts` (F5-03): lógica testable con `node:test` sin necesidad de
// renderizar el árbol de React. Único punto que conoce `getTravelProvider()`
// para esta página — el resto (`page.tsx`) solo conoce `PropertyDetailResult`.
//
// Mapeo de errores igual que F5-02 (mismo modelo de F4-03, ninguna
// categoría nueva): `ProviderUnavailableError` (F4-03: "el alojamiento
// consultado no está disponible") se interpreta aquí como "no existe" —
// es exactamente el error que lanza `MockHotelProvider.getDetails()`
// cuando el id no está en el catálogo (`requirePropertyState`). Cualquier
// otro `TravelProviderError` es un fallo técnico distinguible. Cualquier
// otro tipo de error no se oculta: se relanza tal cual.
//
// Extensión F5-05 (documentada): registra `hotel_viewed`
// (VIAO_ARCHITECTURE.md sección 10 punto 6) mediante `logAnalyticsEvent()`
// — únicamente en la rama `found`, es decir, solo cuando `getDetails()`
// devuelve realmente un alojamiento. Ni `not_found` ni `provider_error`
// registran el evento: F5-05 exige explícitamente que abrir el detalle de
// un id inexistente NO genere `hotel_viewed`.
//
// Extensión F5-07 (documentada): recibe el `search_id` que llega como
// query param (F5-06 `searches.id`, propagado por el enlace de F5-03 —
// ver `buildPropertyHref` en app/search/results/format.ts) y lo trata
// como input externo no confiable: si no tiene forma de UUID, se ignora
// (equivale a ausencia) — sin lanzar y sin consultar `searches` solo para
// validarlo (no es necesario: el formato ya descarta la inmensa mayoría de
// valores corruptos, y un UUID bien formado pero inexistente no rompe nada
// downstream porque no se usa como FK en este código, solo como metadata
// informativa). Cuando es válido, se añade a la metadata de `hotel_viewed`
// (VIAO_DATABASE.md sección 12 ya prevé `search_id` como ejemplo de
// contenido de `metadata`, así que no es una columna nueva) y se devuelve
// en `PropertyDetailResult` para que quede disponible para fases futuras
// (Fase 6) — sin propagarlo más allá de esta página todavía.

import { getTravelProvider } from "../../../lib/travel-provider";
import {
  ProviderUnavailableError,
  TravelProviderError,
} from "../../../lib/travel-provider/errors";
import { logAnalyticsEvent } from "../../../lib/analytics/log-event";
import type { Property } from "../../../types/travel";

export type PropertyDetailResult =
  | { status: "found"; property: Property; searchId?: string }
  | { status: "not_found" }
  | { status: "provider_error"; message: string };

/** Formato UUID estándar (8-4-4-4-12 hex), cualquier versión — igual que el tipo `uuid` de Postgres, sin fijar una versión concreta. */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function classifyDetailError(error: unknown): PropertyDetailResult {
  if (error instanceof ProviderUnavailableError) {
    return { status: "not_found" };
  }
  if (error instanceof TravelProviderError) {
    return { status: "provider_error", message: error.message };
  }
  throw error;
}

export async function resolvePropertyDetail(
  id: string,
  rawSearchId?: string,
): Promise<PropertyDetailResult> {
  const provider = getTravelProvider();
  const searchId =
    rawSearchId && isValidUuid(rawSearchId) ? rawSearchId : undefined;

  try {
    const property = await provider.getDetails(id);
    await logAnalyticsEvent("hotel_viewed", {
      providerPropertyId: property.providerPropertyId,
      ...(searchId ? { searchId } : {}),
    });
    return { status: "found", property, searchId };
  } catch (error) {
    return classifyDetailError(error);
  }
}
