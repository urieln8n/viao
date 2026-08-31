import { LoadingState } from "@/components/state/loading-state";

// FASE J-B1 (Premium Foundation + Navigation) — mismo patrón que
// app/search/results/loading.tsx (F5-03): se muestra automáticamente
// mientras `TripsPage` (Server Component) resuelve `getUserTrips()`.
// Reutiliza el estado de carga genérico ya existente.
export default function Loading() {
  return <LoadingState className="flex-1" />;
}
