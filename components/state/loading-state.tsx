import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// F2-04 (VIAO_ROADMAP.md) — estado genérico reutilizable, sin lógica de
// negocio. No sabe qué se está cargando, solo comunica que algo lo está.
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Cargando...",
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
