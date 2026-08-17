"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Luggage, Wallet, User } from "lucide-react";

import { cn } from "@/lib/utils";

// Navegación principal (F2-02, VIAO_ROADMAP.md). Secciones y rutas exactas
// según VIAO_ARCHITECTURE.md sección 3: search/, trips/ ("Mi viaje"),
// rewards/ ("Wallet"), profile/ ("Perfil"). Sin lógica de negocio: solo
// enlaces reales a las rutas placeholder correspondientes.
const NAV_ITEMS = [
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/trips", label: "Mi viaje", icon: Luggage },
  { href: "/rewards", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Perfil", icon: User },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-50 flex w-full items-stretch border-t border-border bg-background"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

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
