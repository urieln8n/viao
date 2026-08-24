// Hotelbeds — Locations/Destinations -> modelo interno de VIAO. Función
// pura, mismo criterio que content-mappers.ts (Content API/Hotels):
// ningún campo inventado — si Hotelbeds no informa `code`/`name`, ese
// destino se descarta en vez de guardar un dato incompleto/inventado.
import type { HotelbedsRawDestination } from "./destinations";

export interface HotelbedsDestination {
  code: string;
  name: string;
  countryCode: string;
  raw: HotelbedsRawDestination;
}

/**
 * `undefined` si el destino no trae `code`/`name`/`countryCode` reales —
 * nunca se inventa un nombre a partir del código ni un countryCode por
 * defecto (a diferencia de `mapHotelbedsContentHotelToProperty`, que sí
 * usa el código como fallback de `name`: ahí `Property.name` es
 * obligatorio para toda la app, aquí un destino incompleto simplemente no
 * es útil para buscar por nombre y se descarta).
 */
export function mapHotelbedsRawDestination(
  raw: HotelbedsRawDestination,
): HotelbedsDestination | undefined {
  const name = raw.name?.content;
  if (!raw.code || !name || !raw.countryCode) {
    return undefined;
  }
  return {
    code: raw.code,
    name,
    countryCode: raw.countryCode,
    raw,
  };
}

/** Aplica `mapHotelbedsRawDestination` a toda la lista, descartando en silencio los destinos incompletos (nunca aborta el sync completo por una fila mala — a diferencia de sync-content.ts, que sí es "fail closed" con solo 2 hoteles fijos: aquí se sincronizan decenas/cientos de destinos, y una fila incompleta no invalida el resto). */
export function mapHotelbedsRawDestinations(
  raw: HotelbedsRawDestination[],
): HotelbedsDestination[] {
  const mapped: HotelbedsDestination[] = [];
  for (const entry of raw) {
    const destination = mapHotelbedsRawDestination(entry);
    if (destination) {
      mapped.push(destination);
    }
  }
  return mapped;
}
