"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Luggage, Wallet, User } from "lucide-react";

import { cn } from "@/lib/utils";

// Navegación principal (F2-02, VIAO_ROADMAP.md). Secciones y rutas exactas
// según VIAO_ARCHITECTURE.md sección 3: search/, trips/ ("Mi viaje"),
// rewards/ ("Wallet"), profile/ ("Perfil"). Sin lógica de negocio: solo
// enlaces reales a las rutas placeholder correspondientes.
//
// Bloque 3 (VIAO Design System) — se añade "Inicio" (/) como quinto
// destino y el componente se oculta en desktop (`lg:hidden`), donde pasa a
// usarse `Sidebar` (misma carpeta). Vision NO se añade aquí: máximo 5
// items en la barra inferior. `isNavItemActive` se exporta para que
// `Sidebar` reutilice exactamente la misma lógica de ruta activa en vez de
// duplicarla.
const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/trips", label: "Mi viaje", icon: Luggage },
  { href: "/rewards", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Perfil", icon: User },
] as const;

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-50 flex w-full items-stretch border-t border-border bg-background lg:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = isNavItemActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:-outline-offset-2",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
