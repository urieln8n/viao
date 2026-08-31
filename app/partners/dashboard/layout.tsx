import type { ReactNode } from "react";

// UX-16.6 (Commerce UX Pro Max) — corrección encontrada durante la propia
// verificación E2E de este bloque: los layouts anidados de Next.js SUMAN
// sobre sus ancestros, nunca los sustituyen. Este layout envuelve tanto
// la ruta bare (/partners/dashboard, sin token) como la anidada
// (/partners/dashboard/[accessToken]) — si ambos renderizaran su propio
// `CommerceChrome`, la ruta con token mostraría DOS cabeceras apiladas
// (confirmado visualmente: "Panel de negocio" + el nombre real, una
// encima de otra). Por eso este layout externo NO renderiza chrome
// propio — deja pasar `children` tal cual, y es el layout más profundo
// (app/partners/dashboard/[accessToken]/layout.tsx) quien aporta el
// único `CommerceChrome` visible en ese caso, ya con el nombre real.
//
// Limitación conocida, señalada en el informe final: la ruta bare
// /partners/dashboard sin token queda sin ningún chrome (ni Sidebar/
// MainNav de Usuario —ya suprimidos por AppShell para esta ruta— ni
// CommerceChrome). En la práctica esto rara vez es visible: page.tsx
// redirige server-side en cuanto resuelve exactamente un Commerce
// vinculado (el caso típico); solo se renderiza sin chrome en los casos
// raros de 0 o 2+ Commerce vinculados a la misma sesión.
export default function DashboardEntryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
