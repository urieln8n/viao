"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

// P14.4-F (F3 — Points Feedback) — patrón de feedback reutilizable para
// "+N Points" tras una acción real. Evento DOM plano
// (`window.dispatchEvent`/`addEventListener`), sin Context ni estado
// global: el proyecto no usa ninguna librería de estado global
// (Zustand/Redux) ni Toast/Sonner ya instalada (comprobado antes de
// escribir esto) — este es el mecanismo más ligero posible sin añadir
// ninguna dependencia nueva. `announcePointsEarned()` se llama desde
// cualquier Client Component tras una Server Action exitosa;
// `<PointsToastHost />` (montado una única vez en app/layout.tsx) es el
// único listener — evita que cada pantalla tenga que montar su propia
// copia.
//
// Reutiliza el lenguaje visual ya establecido del único "momento
// celebrate" del sistema (`--animate-celebrate`, app/globals.css — su
// propio comentario ya reservaba este tratamiento para "Mission
// completada, Reward conseguido", nunca implementado para Missions hasta
// este bloque): mismos colores `success`, mismo icono `CheckCircle2`.
// `motion-safe:` (variante nativa de Tailwind) es la única forma en que
// se aplica la animación — bajo `prefers-reduced-motion: reduce` el
// toast aparece/desaparece sin ninguna transición, nunca se pierde la
// información.
const POINTS_EARNED_EVENT = "viao:points-earned";
const AUTO_DISMISS_MS = 4000;

export interface PointsEarnedEventDetail {
  amount: number;
  reasonKey: TranslationKey;
}

/** Dispara el toast desde cualquier Client Component. No lanza si se llama fuera del navegador (SSR) — no-op seguro. */
export function announcePointsEarned(amount: number, reasonKey: TranslationKey): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PointsEarnedEventDetail>(POINTS_EARNED_EVENT, { detail: { amount, reasonKey } }));
}

export function PointsToastHost() {
  const [toast, setToast] = useState<PointsEarnedEventDetail | null>(null);

  useEffect(() => {
    function handlePointsEarned(event: Event) {
      const detail = (event as CustomEvent<PointsEarnedEventDetail>).detail;
      setToast(detail);
    }
    window.addEventListener(POINTS_EARNED_EVENT, handlePointsEarned);
    return () => window.removeEventListener(POINTS_EARNED_EVENT, handlePointsEarned);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    // Región accesible: se anuncia una sola vez al aparecer (aria-live
    // "polite", no bloqueante) — mismo criterio ya usado en
    // app/landing-first-experience.tsx para el reveal de Points de
    // ejemplo. `pointer-events-none` en el contenedor + `pointer-events-auto`
    // solo en el toast: nunca bloquea clics en el resto de la pantalla
    // mientras está visible (requisito "no bloqueante").
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 flex justify-center px-4 lg:bottom-6 lg:justify-end lg:pr-8"
    >
      {toast && (
        <div
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-lg border border-success/20 bg-card px-4 py-3 shadow-lg",
            "motion-safe:animate-celebrate",
          )}
        >
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold tabular-nums text-success">
              +{toast.amount} {t("rewards.pointsUnit")}
            </span>
            <span className="text-xs text-muted-foreground">{t(toast.reasonKey)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
