import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";

// F5-03 (VIAO_ROADMAP.md) — convención nativa de Next.js (`loading.tsx`):
// se muestra automáticamente mientras `SearchResultsPage` (Server
// Component, incluida su llamada a `searchAction`) se resuelve. Reutiliza
// el estado de carga genérico de F2-04, sin lógica propia.
export default function Loading() {
  return (
    <LoadingState message={t("results.loadingMessage")} className="flex-1" />
  );
}
