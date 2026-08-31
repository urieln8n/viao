import { LoadingState } from "@/components/state/loading-state";

// FASE J-B1 (Premium Foundation + Navigation) — convención nativa de
// Next.js (`loading.tsx`), mismo patrón que app/search/results/loading.tsx
// (F5-03): se muestra automáticamente mientras `Home` (Server Component,
// incluidas sus llamadas a lib/trips, lib/rewards, lib/goals, lib/missions
// y lib/destinations) se resuelve. Reutiliza el estado de carga genérico
// ya existente, sin lógica propia.
export default function Loading() {
  return <LoadingState className="flex-1" />;
}
