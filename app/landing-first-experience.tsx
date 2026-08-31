"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Coffee, Sparkles, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

// UX-14 (Landing educativa + First Experience) — experiencia interactiva
// puramente educativa para el usuario deslogueado en Home. Deliberadamente
// NO reimplementa `floor(importe × tasa)` (fórmula real, solo vive en SQL,
// `complete_partner_activity()`): duplicarla en TypeScript sería crear una
// segunda copia de una regla LOCKED. En su lugar usa 3 pares fijos
// actividad->Points "de ejemplo", declarados aquí mismo, sin relación con
// la tasa real ni con ningún RPC. Estado 100% efímero (`useState`, sin
// fetch/Supabase/localStorage/cookies) — se reinicia en cualquier recarga.
//
// UX-14.1 (P1) — hallazgo de la auditoría independiente: la primera
// versión mostraba el resultado ya en su valor final (barra montada
// directamente al progreso, número sin animar) — la "revelación" no se
// veía. Ahora el reveal tiene 3 fases reales: idle -> revealing (delay de
// anticipación, sin cambiar nada visualmente aún) -> counting (número y
// barra animan juntos desde 0 hasta el valor de ejemplo, vía
// requestAnimationFrame) -> revealed (texto de cierre + CTA). Con
// prefers-reduced-motion, se salta directo a revealed con el valor final.
interface ExampleActivity {
  key: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  examplePoints: number;
}

// Denominador ilustrativo de la barra de progreso — deliberadamente mayor
// que el ejemplo más alto (25) para que el resultado nunca llegue al 100%:
// evita insinuar "Goal completado", semántica que `GOAL_COMPLETION_SEMANTICS`
// deja abierta (Decision Lock de Goals) y que este bloque no debe prometer.
const EXAMPLE_PROGRESS_DENOMINATOR = 30;

// UX-14.1 §6 — la auditoría consideró 400ms demasiado corto para
// percibirse como anticipación real; 700ms está dentro del rango pedido
// (600-800ms). COUNT_UP_MS es la duración del conteo/barra una vez
// empieza a revelarse, deliberadamente corta (sensación ágil, no una
// carga simulada).
const REVEAL_DELAY_MS = 700;
const COUNT_UP_MS = 550;

const EXAMPLE_ACTIVITIES: readonly ExampleActivity[] = [
  { key: "cafe", icon: Coffee, labelKey: "home.landingExperienceCafeLabel", examplePoints: 4 },
  { key: "meal", icon: UtensilsCrossed, labelKey: "home.landingExperienceMealLabel", examplePoints: 12 },
  { key: "activity", icon: Sparkles, labelKey: "home.landingExperienceActivityLabel", examplePoints: 25 },
];

type ExperienceState = "idle" | "revealing" | "counting" | "revealed";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingFirstExperience() {
  const [selected, setSelected] = useState<ExampleActivity | null>(null);
  const [state, setState] = useState<ExperienceState>("idle");
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
      if (rafRef.current !== undefined) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function runCountUp(target: number) {
    // Sin `performance.now()` en el cuerpo del componente (regla de
    // pureza de React): el propio timestamp que recibe el callback de
    // `requestAnimationFrame` sirve como referencia de inicio en el
    // primer frame.
    let start: number | undefined;
    function step(now: number) {
      if (start === undefined) start = now;
      const elapsed = Math.min(1, (now - start) / COUNT_UP_MS);
      setDisplayedPoints(Math.round(elapsed * target));
      if (elapsed < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        setState("revealed");
      }
    }
    rafRef.current = window.requestAnimationFrame(step);
  }

  function handleSelect(activity: ExampleActivity) {
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    if (rafRef.current !== undefined) window.cancelAnimationFrame(rafRef.current);

    setSelected(activity);
    setDisplayedPoints(0);

    if (prefersReducedMotion()) {
      setState("revealed");
      setDisplayedPoints(activity.examplePoints);
      return;
    }

    setState("revealing");
    timeoutRef.current = window.setTimeout(() => {
      setState("counting");
      runCountUp(activity.examplePoints);
    }, REVEAL_DELAY_MS);
  }

  const progressPercent = Math.min(100, Math.round((displayedPoints / EXAMPLE_PROGRESS_DENOMINATOR) * 100));
  const isCountingOrRevealed = state === "counting" || state === "revealed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("home.landingExperienceTitle")}</CardTitle>
        <CardDescription>{t("home.landingExperienceSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {EXAMPLE_ACTIVITIES.map((activity) => {
            const Icon = activity.icon;
            const isSelected = selected?.key === activity.key;
            return (
              <button
                key={activity.key}
                type="button"
                onClick={() => handleSelect(activity)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "border-viao-orange bg-viao-orange/10 text-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {t(activity.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Región accesible dedicada: se anuncia UNA sola vez, al llegar a
            "revealed" — nunca en cada frame del conteo (evitaría spam de
            lector de pantalla). El bloque visual de abajo no lleva
            aria-live por el mismo motivo. */}
        <div aria-live="polite" className="sr-only">
          {state === "revealed" && selected
            ? `${t("home.landingExperienceResultPrefix")}: ${selected.examplePoints} ${t("rewards.pointsUnit")}`
            : ""}
        </div>

        {state !== "idle" && selected && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-opacity duration-300 motion-reduce:transition-none">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("home.landingExperienceResultPrefix")}
            </span>
            {isCountingOrRevealed ? (
              <>
                <span className="font-mono text-2xl font-semibold tabular-nums text-success">
                  +{displayedPoints} {t("rewards.pointsUnit")}
                </span>
                <Progress value={progressPercent} />
                {state === "revealed" && (
                  <>
                    <p className="text-xs text-muted-foreground">{t("home.landingExperienceResultCaption")}</p>
                    <p className="text-sm font-medium">{t("home.landingExperienceClosing")}</p>
                  </>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground" aria-hidden="true">
                &hellip;
              </span>
            )}
          </div>
        )}

        {state === "revealed" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{t("home.landingFinalCtaText")}</p>
            <Link href="/register" className={buttonVariants({ variant: "default", className: "w-fit" })}>
              {t("home.createAccountCta")}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
