"use client";

import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

// UX-16.5/UX-16.6 (Commerce UX Pro Max) — chrome mínimo y propio para las
// rutas de Commerce (PD-20, OPEN — sigue siendo una propuesta concreta,
// no una decisión cerrada), en vez de heredar la barra inferior de 5
// ítems pensada para Usuario (Inicio/Mi objetivo/Missions/Wallet/Perfil).
// `businessName` llega resuelto desde el layout anidado correspondiente
// (app/partners/dashboard/[accessToken]/layout.tsx,
// app/partners/ops/[accessToken]/layout.tsx), que reutiliza
// `resolvePartnerAccess()` ya existente — este componente nunca resuelve
// tokens ni consulta Supabase por su cuenta. Sin `businessName` (ruta sin
// token, o token no resuelto), usa el fallback i18n.
export function CommerceChrome({ businessName }: { businessName?: string }) {
  return (
    // UX Pro Max V2 (P1.2) — companion necesario de la corrección de
    // MainNav: con viewportFit="cover" (app/layout.tsx) activo para que
    // el safe-area-inset-bottom de MainNav funcione, este es el único
    // header sticky-top de la app y quedaría parcialmente oculto detrás
    // del notch/status bar sin su propio inset. Mismo criterio — se suma
    // al padding existente, min-h-14 intacto, 0 en dispositivos sin ese
    // inset.
    <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Store className="size-5 text-muted-foreground" aria-hidden="true" />
        {businessName ?? t("commerceChrome.fallbackTitle")}
      </span>
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}>
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("commerceChrome.exitCta")}
      </Link>
    </header>
  );
}
