"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

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
//
// UX-16.6 (Commerce UX Pro Max) — corrección respecto al plan original de
// este mismo bloque: un layout anidado de Next.js (app/partners/dashboard/
// [accessToken]/layout.tsx, etc.) SUMA sobre sus ancestros, nunca los
// sustituye — si AppShell dejara de conocer las rutas de Commerce por
// completo, Sidebar/MainNav volverían a aparecer siempre (regresión
// directa de P0-1, ya resuelto en UX-16.5). AppShell conserva, por tanto,
// la MÍNIMA detección de ruta indispensable — solo para decidir si oculta
// Sidebar/MainNav — pero YA NO renderiza su propio `CommerceChrome`: esa
// responsabilidad vive ahora únicamente en los layouts anidados de
// Commerce, que sí tienen acceso a `accessToken` para resolver el nombre
// real (PD-21). Chequeo exacto — nunca `pathname.startsWith("/partners")`
// — mismo criterio que UX-16.5.
function isCommerceRoute(pathname: string): boolean {
  return (
    pathname === "/partners/dashboard" ||
    pathname.startsWith("/partners/dashboard/") ||
    pathname === "/partners/ops" ||
    pathname.startsWith("/partners/ops/")
  );
}

// UX Pro Max V2 (P1.1) — mismo criterio exacto que isCommerceRoute() de
// arriba: pantallas de una sola tarea (Auth, Onboarding, alta de Partner)
// donde Sidebar/MainNav no aportan nada (sin sesión, la mitad de sus
// items lleva a "inicia sesión") y, en mobile, la barra inferior competía
// visualmente con el único CTA que importa en ese momento. Lista cerrada
// y exacta (nunca startsWith genérico): son 7 rutas estáticas conocidas,
// no un prefijo con hijos dinámicos como /partners/dashboard/[accessToken].
const AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/recover",
  "/recover/update",
  "/confirm",
  "/onboarding",
  "/partners/join",
]);

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isCommerceRoute(pathname) || isAuthRoute(pathname)) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">{children}</div>
      <MainNav />
    </>
  );
}
