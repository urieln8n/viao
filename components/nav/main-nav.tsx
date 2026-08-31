"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target, ListChecks, Wallet, User } from "lucide-react";

import { cn } from "@/lib/utils";

// Navegación principal (F2-02, VIAO_ROADMAP.md). Sin lógica de negocio:
// solo enlaces reales a rutas ya existentes. `isNavItemActive` se exporta
// para que `Sidebar` reutilice exactamente la misma lógica de ruta activa
// en vez de duplicarla.
//
// Bloque 3 (VIAO Design System) — componente oculto en desktop
// (`lg:hidden`), donde pasa a usarse `Sidebar` (misma carpeta). Vision NO
// se añade aquí: máximo 5 items en la barra inferior.
//
// FASE J-B1 (Premium Foundation + Navigation) — realineado con el grupo
// MAIN de `Sidebar` (Inicio, Mi objetivo, Missions, Wallet) + Perfil, en
// vez del set anterior (Inicio, Explorar, Mi viaje, Wallet, Perfil).
// Decisión explícita: "Explorar" y "Mi viaje" salen de los 5 slots fijos
// de la barra inferior porque en el nuevo Sidebar de escritorio pasan a
// ser SECONDARY, no MAIN — no se eliminan del producto (siguen siendo
// rutas completas y funcionales, alcanzables desde los chips de destino y
// el CTA de Home, y desde el propio Sidebar en desktop), solo dejan de
// ocupar un slot fijo en mobile. Es la decisión de mayor impacto de este
// bloque; revisar y confirmar/revertir si no es la lectura correcta.
// "Mi objetivo" (`/#goal`) y "Missions" (`/#missions`) usan el mismo
// patrón de ancla sin scroll-spy que ya usaba Sidebar (Micro-bloque 3B):
// nunca se muestran activos por hash, solo "Inicio" se ilumina en `/`.
const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/#goal", label: "Mi objetivo", icon: Target },
  { href: "/#missions", label: "Missions", icon: ListChecks },
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
            <span
              className={cn(
                "flex items-center justify-center rounded-full px-3 py-1 transition-colors",
                isActive && "bg-accent",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
