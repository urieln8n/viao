import { getCachedDestinations } from "../destinations/get-cached-destinations";

// FPR-HOTELS-02 — Implementación real de `HotelbedsDestinationResolver`
// (lib/travel-provider/hotelbeds-provider.ts), separada en su propio
// archivo para poder probarla contra Supabase local real sin romper la
// convención de hotelbeds-provider.test.ts ("ninguno de estos tests
// llama a Hotelbeds ni a Supabase").
//
// Busca `destination` por nombre EXACTO, case-insensitive, dentro del
// catálogo cacheado de `destinations` (sincronizado desde Hotelbeds
// Locations/Destinations, lib/hotelbeds/sync-destinations.ts) — nunca
// fuzzy matching aquí; la tolerancia a variantes de escritura es
// responsabilidad del autocomplete (el usuario elige de una lista real
// antes de buscar, FPR-HOTELS-02). `undefined` si no hay coincidencia
// exacta — nunca adivina el destino más parecido.
export async function resolveHotelbedsDestinationCodeByName(
  destination: string,
): Promise<string | undefined> {
  const needle = destination.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  const catalog = await getCachedDestinations("hotelbeds");
  const match = catalog.find((entry) => entry.name.trim().toLowerCase() === needle);
  return match?.code;
}
