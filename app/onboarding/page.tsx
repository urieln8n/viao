"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { GoalForm } from "../goal-card";

// Fase 1 (Prompt Maestro 24/08/2026) — primera pantalla tras el
// registro: "¿Para qué quieres usar VIAO?". Reutiliza `GoalForm`
// (extraído de `app/goal-card.tsx`) — misma validación, misma
// `createGoalAction`, sin una segunda implementación de creación de
// Goal. "Ahora no" lleva a Home sin crear nada — no bloquea al usuario.
export default function OnboardingPage() {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("onboarding.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
        <p className="text-sm font-medium">{t("onboarding.concept")}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("onboarding.goalQuestion")}</CardTitle>
        </CardHeader>
        <CardContent>
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
