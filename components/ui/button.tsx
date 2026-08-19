import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Bloque 13 ("Pulido final antes del piloto") — hallazgo de la auditoría
// visual: la clase base incluía `border-transparent`, y la variante
// `outline` declaraba por su cuenta `border-border` — ambas fijan la
// misma propiedad CSS (`border-color`) al mismo nivel de especificidad, y
// `cn()` (lib/utils.ts) usa `tailwind-merge` para deduplicar conflictos de
// este tipo. `tailwind-merge` no reconoce los tokens de color propios del
// tema de este proyecto (`border`, `input`, etc., definidos vía CSS
// custom properties) como "colores" válidos para su tabla de conflictos
// por defecto, así que NO deduplicaba estas dos clases — dejaba a ambas
// en el DOM y el orden de aparición en la hoja de estilos generada (no la
// intención del desarrollador) decidía cuál ganaba: en la práctica,
// `border-transparent` siempre ganaba, dejando `outline` con un borde
// invisible en reposo, verificado con `getComputedStyle` (`border: 1px
// solid rgba(0, 0, 0, 0)`) en varios puntos ya existentes de la app.
//
// Corrección mínima y acotada a este componente (sin tocar `cn()`/
// `tailwind-merge` globalmente, que afectaría a todos los componentes del
// proyecto): se retira `border-transparent` de la clase base compartida
// — solo queda `border` (ancho, sin color) para seguir reservando el
// espacio del borde y evitar salto de layout al enfocar
// (`focus-visible:border-ring`) — y cada variante declara ahora su propio
// color de borde en reposo explícitamente. Así ninguna variante depende
// de que `tailwind-merge` resuelva un conflicto que no sabe resolver.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Bloque 19 ("Identidad visual") — antes usaba --primary (negro/
        // blanco puro, oklch con croma 0), igual que cualquier otro
        // elemento neutro del sistema. Ahora usa el naranja de marca
        // (--viao-orange, app/globals.css), para que la acción PRINCIPAL
        // de cada pantalla sea reconocible como "esto es VIAO", no un
        // botón genérico. Texto oscuro (--viao-orange-foreground), no
        // blanco: verificado con cálculo real de contraste — blanco sobre
        // este naranja solo da 3.69:1 (no pasa AA texto normal), oscuro da
        // 4.88:1 (si pasa) — distinto del patrón de --primary a propósito.
        default: "border-transparent bg-viao-orange text-viao-orange-foreground hover:bg-viao-orange/85",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      // Bloque 23 ("Corrección P1 mobile touch targets") — alturas
      // subidas al mínimo táctil recomendado (~44px, Apple HIG/Material).
      // Verificado por grep antes de tocar nada: `default` se usa en toda
      // la app (mayor impacto, la razón real de este bloque); `sm` solo
      // en 3 sitios, todos enlaces independientes con espacio propio
      // (app/page.tsx, app/profile/page.tsx x2) — sin layouts apretados
      // donde 44px pudiera romper algo; `lg`/`xs` no se usan en ningún
      // sitio hoy (cero riesgo de regresión visual). Solo se cambia
      // `h-*` — gap/padding/tipografía/color intactos, tal como se pidió
      // ("no rediseñar"). Las variantes `icon*` (cuadradas) no se tocan:
      // no están pedidas explícitamente y su único uso real es dentro de
      // `Dialog`, que no se renderiza en ningún sitio de la app.
      size: {
        default:
          "h-11 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-9 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
