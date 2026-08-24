import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Bloque Premium Design System V1 (Fase B) — mismo patrón que Button
// (cva, tokens semánticos existentes, sin colores nuevos). Discreta a
// propósito: relleno suave + texto del color semántico (mismo criterio
// ya usado por Button en su variante `destructive`, `bg-destructive/10
// text-destructive`, no un relleno sólido con texto blanco) — evita el
// aspecto "gaming"/pill llamativo explícitamente descartado.
//
// `success` no dependía únicamente del color antes de este cambio
// (Missions ya usaba `line-through` en el nombre para el estado
// completado) — se mantiene esa señal no-solo-color en
// `missions-summary.tsx`, el Badge es un refuerzo, no la única señal.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-transparent bg-success/10 text-success dark:bg-success/15",
        destructive: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
