import type { ReactNode } from "react";

import { MainNav } from "@/components/nav/main-nav";
import { Sidebar } from "@/components/nav/sidebar";

// Bloque 3 (VIAO Design System) — envoltorio visual del layout raíz.
// `Sidebar` (desktop, `lg`+) usa `position: fixed`, así que queda fuera
// del flujo normal y no participa en este layout. `MainNav`
// (mobile/tablet) sigue siendo hermano directo del contenido, igual que
// antes de este bloque. La decisión Sidebar/MainNav es puramente CSS
// (breakpoint `lg`, ver ambos componentes), sin detección de viewport por
// JavaScript ni hidratación condicional.
//
// Reserva de los 240px del Sidebar en desktop: `lg:pl-60` — la referencia
// original del bloque. En Bloque 3 esto no funcionaba (`app/globals.css`
// tenía `* { padding: 0; margin: 0; }` fuera de cualquier `@layer`,
// anulando cualquier utilidad de padding/margin de toda la app) y se usó
// `grid-template-columns` como workaround. Bloque 5 corrigió la causa
// raíz (el reset ahora vive dentro de `@layer base`) — verificado
// empíricamente que `lg:pl-60` ya resuelve a `padding-left: 240px`
// correctamente, así que se vuelve a la solución simple original.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">{children}</div>
      <MainNav />
    </>
  );
}
