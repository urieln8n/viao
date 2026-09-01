import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

// F2-04 (VIAO_ROADMAP.md) — estado genérico reutilizable, sin lógica de
// negocio. `message` lo aporta quien lo usa; `action` es un hueco opcional
// (p. ej. un botón de "Reintentar") controlado por el consumidor, no por
// este componente.
//
// UX Pro Max V2 (P2.1) — mismo criterio que EmptyState: `locale` opcional,
// solo afecta al `title` por defecto (ese literal en español vivía fuera
// del diccionario i18n). Corrige el caso real detectado en /profile: con
// la pantalla en inglés, el `message` ya llegaba traducido pero el título
// de encima seguía en español porque nunca pasaba por t().
interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
  locale?: string | null;
}

export function ErrorState({
  locale,
  title = t("states.errorDefaultTitle", locale),
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 text-center",
        className,
      )}
    >
      <CircleAlert className="size-6 text-destructive" aria-hidden="true" />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
