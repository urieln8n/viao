import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

// Bloque Premium Design System V1 (Fase B) — envuelve la primitiva
// accesible de @base-ui/react (mismo patrón ya usado en Button/Input):
// `ProgressRoot` ya expone `role="progressbar"` + `aria-valuenow`/
// `aria-valuemin`/`aria-valuemax` y clampa el valor internamente (0-100
// para el porcentaje visual, `min`/`max` para el valor crudo) —
// verificado leyendo el propio código fuente de la librería antes de
// escribir este componente, no asumido. `ProgressIndicator` calcula su
// propio `width` a partir del valor ya clampado — este archivo solo
// añade el lenguaje visual de VIAO (track `bg-muted`, indicador
// `bg-success`, mismo `h-2`/`rounded-full` que ya usaba la barra
// hand-rolled del Goal antes de este bloque), sin reimplementar
// accesibilidad ni cálculo de ancho a mano.
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("w-full", className)}
      // Bloque 2.1 (fix hydration mismatch) — sin `locale` explícito,
      // ProgressRoot formatea `aria-valuetext` con
      // `Intl.NumberFormat(undefined, {style:"percent"})`
      // (node_modules/@base-ui/react/progress/root/ProgressRoot.js),
      // cuyo locale por defecto es el del entorno de ejecución: distinto
      // en el servidor (Node/SSR) que en el navegador del cliente ->
      // "1 %" vs "1%", hydration mismatch real. "es" ya es el locale
      // funcional de facto de toda la app (`DEFAULT_LOCALE`,
      // lib/i18n/types.ts) — fijarlo aquí hace el formateo determinista
      // en vez de depender del entorno. Antes de `{...props}` para que
      // siga siendo overridable si algún consumidor futuro lo necesitara.
      locale="es"
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="block h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="block h-full rounded-full bg-success transition-[width] duration-300 ease-out"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
