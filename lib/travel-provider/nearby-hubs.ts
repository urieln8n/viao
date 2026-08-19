// Bloque 22 ("Movilidad + recomendaciones del viaje") — datos de
// referencia de estación de tren y aeropuerto principal por cada una de
// las 4 ciudades del catálogo actual del MVP (mismas 4 que
// `mock-provider.ts`). Archivo separado de `mock-provider.ts` a propósito
// (auditoría del Bloque 21): son datos de referencia de transporte, no
// datos de búsqueda/matching de alojamientos — mezclarlos habría
// acoplado dos responsabilidades distintas sin necesidad.
//
// Coordenadas verificadas contra fuentes públicas (Wikipedia/Adif/AENA)
// durante la auditoría del Bloque 21, nunca inventadas. Como distintas
// fuentes difieren en unas pocas decenas de metros para el mismo lugar,
// se fija aquí un único valor por hub — si se necesita mayor precisión
// en el futuro, se documenta el cambio aquí, en un único sitio.
//
// NO se persiste nada de este archivo en Supabase — son constantes en
// código, igual que `listKnownDestinations()` en `mock-provider.ts`. NO
// existe (ni se necesita) una tabla `trip_places` para esto (ver
// auditoría del Bloque 21, sección K): estación/aeropuerto se calculan
// dinámicamente en cada carga de la página, nunca se guardan.

export interface NearbyHub {
  city: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const NEARBY_TRAIN_STATIONS: readonly NearbyHub[] = [
  { city: "Madrid", name: "Madrid Atocha", latitude: 40.4066, longitude: -3.6906 },
  { city: "Barcelona", name: "Barcelona Sants", latitude: 41.3789, longitude: 2.14 },
  { city: "Sevilla", name: "Sevilla Santa Justa", latitude: 37.3922, longitude: -5.975 },
  { city: "Valencia", name: "Valencia Joaquín Sorolla", latitude: 39.4596, longitude: -0.3814 },
];

export const NEARBY_AIRPORTS: readonly NearbyHub[] = [
  {
    city: "Madrid",
    name: "Adolfo Suárez Madrid-Barajas",
    latitude: 40.4936,
    longitude: -3.5668,
  },
  {
    city: "Barcelona",
    name: "Josep Tarradellas Barcelona-El Prat",
    latitude: 41.2971,
    longitude: 2.0785,
  },
  { city: "Sevilla", name: "Sevilla (San Pablo)", latitude: 37.4181, longitude: -5.8989 },
  { city: "Valencia", name: "Valencia (Manises)", latitude: 39.4894, longitude: -0.4817 },
];

/**
 * Distancia en línea recta (fórmula de Haversine, sin API externa) entre
 * dos coordenadas — suficiente para "a cuántos km está" en el MVP; no
 * pretende ser una distancia real de carretera/transporte.
 */
export function calculateDistanceKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(destinationLat - originLat);
  const dLng = toRad(destinationLng - originLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(originLat)) * Math.cos(toRad(destinationLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/** `undefined` si la ciudad no está en el catálogo de referencia — nunca se inventa un hub. */
export function findNearestTrainStation(city: string): NearbyHub | undefined {
  return NEARBY_TRAIN_STATIONS.find(
    (station) => station.city.toLowerCase() === city.trim().toLowerCase(),
  );
}

/** `undefined` si la ciudad no está en el catálogo de referencia — nunca se inventa un hub. */
export function findNearestAirport(city: string): NearbyHub | undefined {
  return NEARBY_AIRPORTS.find((airport) => airport.city.toLowerCase() === city.trim().toLowerCase());
}
