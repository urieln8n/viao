"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles, Gift } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { GoalForm } from "../goal-card";

type Step = "welcome" | "goal";

// UX-AUTH-1 (Decision Lock, §B/§C/§G) — /onboarding es un flujo de 2
// pasos internos a este único Client Component, sin URL propia por paso
// (Decision Lock §8: "no crear /onboarding/welcome ni /onboarding/goal")
// y sin persistir nada (Decision Lock §K: nada enlaza de vuelta a
// /onboarding tras la primera visita, así que no hace falta evitar
// repetirlo).
//
// Paso 1 (Welcome, nuevo): explica VIAO en <10s antes de pedir cualquier
// compromiso — hallazgo P1 de la auditoría UX-AUTH ("se pide crear un
// Goal sin haber explicado qué es VIAO"). Máximo 3 conceptos, un único
// CTA dominante ("Empezar") + una acción secundaria discreta que salta
// directo a Home sin pasar por Goal.
//
// Paso 2 (Goal, ya existente — Fase 1, Prompt Maestro 24/08/2026):
// reutiliza GoalForm (extraído de app/goal-card.tsx) tal cual, misma
// validación, misma createGoalAction, sin una segunda implementación de
// creación de Goal. Único cambio de este bloque: una frase de contexto
// breve antes del formulario. "Ahora no" sigue llevando a Home sin crear
// nada — nunca bloquea.
export function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const goalHeadingRef = useRef<HTMLDivElement>(null);

  // UX-AUTH-1 — al pasar de Welcome a Goal, el foco se mueve al título
  // del nuevo paso (mismo criterio que cualquier transición de "página"
  // dentro de una SPA: el usuario de teclado/lector de pantalla debe
  // saber que el contenido cambió, sin depender de que vea el cambio
  // visual). No toca GoalForm en absoluto.
  useEffect(() => {
    if (step === "goal") {
      goalHeadingRef.current?.focus();
    }
  }, [step]);

  if (step === "welcome") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold">{t("onboarding.welcomeHeadline")}</h1>
          <p className="text-sm text-muted-foreground">{t("onboarding.welcomeSubtitle")}</p>
        </div>

        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">{t("onboarding.welcomeConcept1")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">{t("onboarding.welcomeConcept2")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Gift className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">{t("onboarding.welcomeConcept3")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <Button type="button" onClick={() => setStep("goal")}>
            {t("onboarding.welcomeContinueCta")}
          </Button>
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground" })}
          >
            {t("onboarding.welcomeSkipCta")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* UX-AUTH-1 (micro-fix, foco visible) — mismo patrón de anillo
              que ya usan Input/Button (focus-visible:ring-3
              focus-visible:ring-ring/50): visible solo con foco por
              teclado/programático, nunca al hacer click con el ratón
              (focus-visible, no focus). rounded-sm evita un anillo de
              esquinas duras sobre texto suelto, sin introducir ningún
              sistema visual nuevo. */}
          <CardTitle
            ref={goalHeadingRef}
            tabIndex={-1}
            className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("onboarding.goalQuestion")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("onboarding.goalContext")}</p>
          <GoalForm onCreated={() => router.push("/")} submitLabel={t("onboarding.continue")} />
        </CardContent>
      </Card>

      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground" })}
      >
        {t("onboarding.skip")}
      </Link>
    </main>
  );
}
