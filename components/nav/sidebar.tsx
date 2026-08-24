"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target, Compass, Luggage, Wallet, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavItemActive } from "./main-nav";

// Bloque 3 (VIAO Design System) — navegación de escritorio (`lg` y
// superiores). Mismas rutas reales que `MainNav` (mismo directorio, usado
// en mobile/tablet). Reutiliza `isNavItemActive` de `./main-nav` en vez de
// duplicar la lógica de detección de ruta activa.
//
// Micro-bloque 1 (Sidebar Premium) — dos grupos con peso visual distinto
// en vez de una lista plana: PRIMARY_NAV_ITEMS (Travel core) arriba, sin
// separador; SECONDARY_NAV_ITEMS (Wallet) debajo de un separador que
// reutiliza el mismo patrón `border-t border-border pt-3` que ya usaba el
// bloque de Perfil más abajo en este archivo — ningún tratamiento visual
// nuevo, solo el que ya existía aquí aplicado también arriba.
//
// Vision se retira de esta lista: no forma parte de la navegación
// principal de escritorio. No se toca `/vision`, su lógica, su backend ni
// ningún otro archivo — sigue siendo accesible desde su acceso
// contextual ya existente en `app/trips/[id]/page.tsx`.
//
// Micro-bloque 3B (Sidebar Beta) — "Buscar" se retira como entrada
// propia: "Mi objetivo" (`/#goal`, ancla ya existente desde Micro-bloque
// 2, GoalCard sin cambios) y "Explorar" (`/#travel`, ancla nueva sobre la
// sección "Cuando estés listo para viajar" de app/page.tsx, /search sin
// tocar) narran mejor "actividad -> Points -> Goal -> viaje" que
// "Buscar hotel". `isNavItemActive()` compara por `pathname`, que nunca
// incluye el hash — estos dos enlaces nunca mostrarán el estado activo
// (deliberado, sin scroll-spy, fuera de alcance de este bloque); "Inicio"
// sigue iluminándose con normalidad al estar en `/`.
const PRIMARY_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/#goal", label: "Mi objetivo", icon: Target },
  { href: "/#travel", label: "Explorar", icon: Compass },
  { href: "/trips", label: "Mi viaje", icon: Luggage },
];

const SECONDARY_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/rewards", label: "Wallet", icon: Wallet },
];

const PROFILE_ITEM: { href: string; label: string; icon: LucideIcon } = {
  href: "/profile",
  label: "Perfil",
  icon: User,
};

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-accent text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <Icon
        className={cn("size-5 shrink-0", active && "text-primary")}
        aria-hidden="true"
      />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-background px-3 py-6 lg:flex"
    >
      {/* Micro-bloque 1 (Sidebar Premium) — mismo token de color
          (`text-primary`), mismo Geist ya global: solo se ajusta peso/
          tamaño/tracking para que el wordmark se lea intencional, sin
          crear ningún isotipo ni asset nuevo. */}
      <span className="px-3 pb-6 text-xl font-bold tracking-tight text-primary">
        VIAO
      </span>

      <nav className="flex flex-1 flex-col gap-1">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}

        <div className="flex flex-col gap-1 border-t border-border pt-3">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              {...item}
              active={isNavItemActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <SidebarLink
          {...PROFILE_ITEM}
          active={isNavItemActive(pathname, PROFILE_ITEM.href)}
        />
      </div>
    </aside>
  );
}
