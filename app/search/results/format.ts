// F5-03 (VIAO_ROADMAP.md) — Formateo puro de los campos del listado de
// resultados (MVP sección 6, punto 3: "foto, nombre, precio, valoración,
// ubicación"). Sin lógica de negocio ni acceso a red: solo transforma los
// datos ya normalizados de `Property`/`PropertyResult` (F4-02/F5-02) en
// texto para mostrar. Separado de `page.tsx` para poder probarlo con
// `node:test` sin necesidad de renderizar el árbol de React.

import type { PriceQuote, Property } from "../../../types/travel";

/** `undefined` cuando la búsqueda no pudo componer un precio para esta propiedad (ver nota F5-03 en actions.ts). */
export function formatPrice(price: PriceQuote | undefined): string | undefined {
  if (!price) {
    return undefined;
  }
  return `${price.amount} ${price.currency}`;
}

/** `undefined` cuando el proveedor no informó ni ciudad ni país para esta propiedad. */
export function formatLocation(
  property: Pick<Property, "city" | "country">,
): string | undefined {
  const parts = [property.city, property.country].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** `undefined` cuando el proveedor no informó valoración para esta propiedad. */
export function formatRating(rating: number | undefined): string | undefined {
  return typeof rating === "number" ? rating.toFixed(1) : undefined;
}

// F5-07 (VIAO_ROADMAP.md) — Enlace de cada tarjeta de resultado al detalle,
// llevando el `searchId` que devolvió `searchAction` (F5-06) como query
// param (`?search_id=`), para que un clic sea trazable hasta la fila de
// `searches`. `searchId` es `undefined` cuando no hay usuario autenticado
// (F5-06: `searches` exige `user_id NOT NULL`) — en ese caso el enlace no
// lleva el query param, y `/properties/[id]` (F5-04) sigue funcionando
// exactamente igual que antes de F5-07 (visita directa sin `search_id`).
export function buildPropertyHref(
  providerPropertyId: string,
  searchId: string | undefined,
): string {
  const basePath = `/properties/${providerPropertyId}`;
  return searchId
    ? `${basePath}?search_id=${encodeURIComponent(searchId)}`
    : basePath;
}
