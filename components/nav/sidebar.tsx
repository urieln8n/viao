"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Luggage, ScanEye, Wallet, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavItemActive } from "./main-nav";

// Bloque 3 (VIAO Design System) — navegación de escritorio (`lg` y
// superiores). Mismas rutas reales que `MainNav` (mismo directorio, usado
// en mobile/tablet) más Vision, que no cabe en el límite de 5 items de la
// barra inferior. Reutiliza `isNavItemActive` de `./main-nav` en vez de
// duplicar la lógica de detección de ruta activa.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/trips", label: "Mi viaje", icon: Luggage },
  { href: "/vision", label: "Vision", icon: ScanEye },
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
      <span className="px-3 pb-6 text-lg font-semibold text-primary">
        VIAO
      </span>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
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
