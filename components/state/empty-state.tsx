import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

// F2-04 (VIAO_ROADMAP.md) — estado genérico reutilizable, sin lógica de
// negocio. `action` es un hueco opcional (p. ej. un botón de "Volver a
// intentar" o un enlace) controlado por el consumidor.
//
// UX Pro Max V2 (P2.1) — `locale` es opcional y solo afecta al `title`
// por defecto: los consumidores que ya pasan su propio `title`/`message`
// (la inmensa mayoría, siempre vía t()) no cambian de comportamiento.
// Antes el default vivía como literal en español fuera de este archivo
// de i18n; ahora respeta el locale igual que cualquier otro texto de la
// app cuando se pasa uno explícito.
interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
  locale?: string | null;
}

export function EmptyState({
  locale,
  title = t("states.emptyDefaultTitle", locale),
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
