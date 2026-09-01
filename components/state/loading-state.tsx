import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

// F2-04 (VIAO_ROADMAP.md) — estado genérico reutilizable, sin lógica de
// negocio. No sabe qué se está cargando, solo comunica que algo lo está.
//
// UX Pro Max V2 (P2.1) — mismo criterio que EmptyState/ErrorState:
// `locale` opcional, solo afecta al `message` por defecto.
interface LoadingStateProps {
  message?: string;
  className?: string;
  locale?: string | null;
}

export function LoadingState({
  locale,
  message = t("states.loadingDefaultMessage", locale),
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 text-center",
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
