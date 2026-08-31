import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  caption?: string;
  action?: ReactNode;
  /** Bloque 6 (VIAO Design System) — "positive" aplica el verde VIAO
   * (`--success`) al valor, para cifras que representan un beneficio real
   * (p. ej. un saldo de Points ya obtenido). No es un color decorativo:
   * se omite deliberadamente cuando no hay nada que celebrar (sin sesión,
   * saldo desconocido) — el propio consumidor decide cuándo aplica. */
  tone?: "default" | "positive";
  className?: string;
}

// Bloque 4 (VIAO Design System) — número protagonista ligero (p. ej.
// balance de Points en Home), sin la envoltura completa de `Card`
// (Header/Content/Footer): "visualmente ligero, no convertir cada número
// en una card pesada" (propuesta de diseño, componente ya previsto ahí).
// Mismo tratamiento flat que el resto del sistema (`ring-1
// ring-foreground/10`, `rounded-xl`, `bg-card`), sin sombra.
export function StatCard({
  label,
  value,
  caption,
  action,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          // UX-2 (World-Class Product Design) — Fase B: font-mono +
          // tabular-nums, mismo criterio ya aplicado en Home/GoalCard —
          // StatCard es precisamente el componente pensado para un
          // número protagonista (comentario original del bloque 4), así
          // que es el sitio de mayor impacto para este tratamiento.
          "font-mono text-3xl font-semibold tabular-nums",
          tone === "positive" && "text-success",
        )}
      >
        {value}
      </span>
      {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
      {action}
    </div>
  );
}
