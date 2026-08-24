import { getCachedDestinations } from "../../lib/destinations/get-cached-destinations";
import { SearchForm } from "./search-form";

// FPR-HOTELS-02 — Server Component: carga el catálogo real de destinos
// (Supabase `destinations`, sincronizado desde Hotelbeds
// Locations/Destinations — ver lib/hotelbeds/sync-destinations.ts) y lo
// pasa a `SearchForm` (client component, contiene toda la lógica de
// formulario que antes vivía aquí). Única fuente de verdad para el
// autocomplete — ya NO usa `MockHotelProvider.listKnownDestinations()`.
//
// `getCachedDestinations` nunca lanza (mismo criterio que
// `getCachedProperties`): un catálogo vacío (Supabase caído, o
// simplemente sin sincronizar todavía, p. ej. en desarrollo local con
// MockHotelProvider activo) da un autocomplete sin sugerencias, nunca
// rompe la página — el usuario siempre puede seguir escribiendo texto
// libre y buscar.
export default async function SearchPage() {
  const destinations = await getCachedDestinations("hotelbeds");

  return <SearchForm destinations={destinations} />;
}
