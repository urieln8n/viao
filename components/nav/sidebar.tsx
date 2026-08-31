"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target, ListChecks, Wallet, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavItemActive } from "./main-nav";

// Bloque 3 (VIAO Design System) — navegación de escritorio (`lg` y
// superiores). Mismas rutas reales que `MainNav` (mismo directorio, usado
// en mobile/tablet). Reutiliza `isNavItemActive` de `./main-nav` en vez de
// duplicar la lógica de detección de ruta activa.
//
// Vision se retira de esta lista: no forma parte de la navegación
// principal de escritorio. No se toca `/vision`, su lógica, su backend ni
// ningún otro archivo — sigue siendo accesible desde su acceso
// contextual ya existente en `app/trips/[id]/page.tsx`.
//
// Corrección estratégica permanente (VIAO no es una app de viajes) — se
// retira el grupo SECONDARY_NAV_ITEMS que FASE J-B1 había introducido
// (Explorar/#search, Mi viaje/#trips): Travel deja de tener cualquier
// punto de entrada en la navegación principal, no solo un menor peso
// visual. Solo queda MAIN_NAV_ITEMS (Inicio, Mi objetivo, Missions,
// Wallet) + ACCOUNT_ITEM (Perfil) — mismo set que ya usaba `MainNav`
// (mobile), ahora también en desktop. `/trips`, `/search`, `/properties`,
// `/booking`, `/vision` NO se tocan ni se eliminan: siguen existiendo
// como rutas completas, simplemente sin entrada en el Sidebar.
const MAIN_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/#goal", label: "Mi objetivo", icon: Target },
  { href: "/#missions", label: "Missions", icon: ListChecks },
  { href: "/rewards", label: "Wallet", icon: Wallet },
];

const ACCOUNT_ITEM: { href: string; label: string; icon: LucideIcon } = {
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
        {MAIN_NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <SidebarLink
          {...ACCOUNT_ITEM}
          active={isNavItemActive(pathname, ACCOUNT_ITEM.href)}
        />
      </div>
    </aside>
  );
}
