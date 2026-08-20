// Hotelbeds — Content API -> Property (types/travel.ts). Funciones
// puras, mismo criterio que lib/hotelbeds/mappers.ts (Availability):
// ningún campo inventado — si Hotelbeds no lo expone, el campo de VIAO
// queda `undefined`.
//
// Foto principal: heurística REAL verificada contra los 2 hoteles ya
// probados con una petición real (3424, 168) — la documentación oficial
// de Hotelbeds dice "visualOrder=0 = imagen principal", pero NINGUNA
// imagen de NINGUNO de los 2 hoteles reales tiene visualOrder=0 (ver
// conversación). La heurística que sí funciona con datos reales: imagen
// `imageTypeCode === "GEN"` (general del hotel, no habitación/
// restaurante/piscina/...) con el `visualOrder` MÍNIMO dentro de ese
// subconjunto. Si el hotel no tiene ninguna imagen GEN, no se cae a otro
// tipo — `mainPhotoUrl` queda `undefined` (mismo criterio de "no
// inventar" que el resto del proyecto).
//
// País: se guarda `countryCode` (p. ej. "ES", "PT") tal cual, no un
// nombre expandido — confirmado que Hotelbeds no lo devuelve ni con
// `fields=all` (ver content.ts); traducirlo a texto legible requeriría
// la operación auxiliar `Countries`, explícitamente fuera de alcance de
// este bloque.
//
// Dirección/descripción/instalaciones/categoría/teléfonos/etc.: NO se
// mapean a columnas propias en este bloque (decisión ya tomada en la
// fase de diseño: ninguna pantalla de VIAO las consume hoy) — quedan
// disponibles igualmente dentro de `raw`, sin coste ni migración extra,
// para cuando se decida usarlas.
import type { Property } from "../../types/travel";
import type { HotelbedsContentImage, HotelbedsRawContentHotel } from "./content";

const PHOTO_BASE_URL = "https://photos.hotelbeds.com/giata";
const PHOTO_SIZE = "bigger";

/** `undefined` si el hotel no tiene ninguna imagen `GEN` — nunca se cae a otro tipo (`HAB`/`RES`/...) para "foto principal". */
export function selectMainGenImage(
  images: HotelbedsContentImage[] | undefined,
): HotelbedsContentImage | undefined {
  const genImages = (images ?? []).filter((image) => image.imageTypeCode === "GEN");
  if (genImages.length === 0) {
    return undefined;
  }
  return genImages.reduce((min, image) =>
    (image.visualOrder ?? Number.POSITIVE_INFINITY) <
    (min.visualOrder ?? Number.POSITIVE_INFINITY)
      ? image
      : min,
  );
}

/** `path` es una ruta relativa (p. ej. "00/003424/003424a_hb_a_009.jpg"), nunca una URL completa — confirmado contra la respuesta real. */
export function buildHotelbedsPhotoUrl(path: string): string {
  return `${PHOTO_BASE_URL}/${PHOTO_SIZE}/${path}`;
}

export function mapHotelbedsContentHotelToProperty(hotel: HotelbedsRawContentHotel): Property {
  const mainImage = selectMainGenImage(hotel.images);
  return {
    providerName: "hotelbeds",
    providerPropertyId: String(hotel.code),
    // Fallback al propio código solo para el caso límite (no observado en
    // los 2 hoteles reales) de que Hotelbeds no informe `name.content` —
    // `Property.name` es obligatorio y el código es el único identificador
    // que sí tenemos siempre, no un nombre inventado.
    name: hotel.name?.content ?? String(hotel.code),
    city: hotel.city?.content,
    country: hotel.countryCode,
    latitude: hotel.coordinates?.latitude,
    longitude: hotel.coordinates?.longitude,
    mainPhotoUrl: mainImage ? buildHotelbedsPhotoUrl(mainImage.path) : undefined,
    raw: hotel,
  };
}
