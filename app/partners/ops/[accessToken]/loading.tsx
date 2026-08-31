import { LoadingState } from "@/components/state/loading-state";

// FASE UX-1.1 (Core UX Quick-Fix Pass) — misma convención nativa de
// Next.js ya usada en app/loading.tsx / app/rewards/loading.tsx: se
// muestra automáticamente mientras se resuelve la navegación a esta
// ruta. Reutiliza el estado de carga genérico ya existente, sin lógica
// propia.
export default function Loading() {
  return <LoadingState className="flex-1" />;
}
