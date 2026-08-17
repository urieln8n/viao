import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

// F2-04 (VIAO_ROADMAP.md) — estado genérico reutilizable, sin lógica de
// negocio. `action` es un hueco opcional (p. ej. un botón de "Volver a
// intentar" o un enlace) controlado por el consumidor.
interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No hay nada que mostrar",
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 text-center",
        className,
      )}
    >
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-base font-semibold">{title}</h2>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {action}
    </div>
  );
}
