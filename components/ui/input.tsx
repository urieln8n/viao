import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// Bloque Premium Design System V1 (Fase A, P0) — altura subida de h-8
// (32px) a h-11 (44px), mismo mínimo táctil recomendado (Apple HIG/
// Material) que Button ya aplicó en el Bloque 23 ("Corrección P1 mobile
// touch targets") — Input era el otro elemento interactivo más común del
// proyecto (todos los formularios: Register, Login, Search, Goal,
// Profile, Booking, Trips) y se había quedado sin esa misma corrección.
// Solo se toca `h-*`: padding/tipografía/color/comportamiento intactos,
// mismo criterio ya usado en Button (no rediseñar, solo igualar el
// target táctil). Todos los consumidores usan layouts flex/grid con
// `gap-*` (nunca alturas fijas de contenedor), así que el aumento de
// altura se acomoda automáticamente sin overflow.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
