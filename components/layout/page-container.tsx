import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerVariant = "default" | "wide" | "narrow";

interface PageContainerProps {
  variant?: PageContainerVariant;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<PageContainerVariant, string> = {
  default: "max-w-xl lg:max-w-3xl",
  wide: "max-w-xl lg:max-w-4xl",
  narrow: "max-w-sm",
};

// Bloque 3 (VIAO Design System) — wrapper puramente visual, preparación
// para unificar el contenedor de ancho repetido en cada página (hallazgo
// de la auditoría de diseño: ~12 páginas repiten el mismo
// `mx-auto max-w-xl p-6` a mano). Ninguna página se migra todavía a este
// componente en este bloque — queda disponible para bloques posteriores.
export function PageContainer({
  variant = "default",
  className,
  children,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full", VARIANT_CLASS[variant], className)}>
      {children}
    </div>
  );
}
