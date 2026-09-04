"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/state/error-state";
import { announcePointsEarned } from "@/components/state/points-toast";
import { t } from "@/lib/i18n";

import { createGoalAction, cancelGoalAction } from "./goals/actions";
import type { ActiveGoal } from "../lib/goals/get-goal";
import { calculateGoalProgressPercent } from "../lib/goals/calculate-progress";

// P14.4-E (Decision Lock OPCIÓN B) — sección mínima de Goal en Home. La
// cifra de progreso es `goal.earnedPoints` ("Points acumulados ganados
// hacia este Goal desde su creación", `lib/goals/get-earned-points.ts`)
// sobre `goal.targetPoints` — YA NO es el saldo de Wallet: canjear un
// Reward no reduce este progreso, un refund no lo infla (excluido
// explícitamente). `walletBalance` deja de ser una prop de este
// componente: `ActiveGoalCard` ya no necesita ningún dato de Wallet para
// mostrar el progreso del Goal (Wallet sigue existiendo y mostrando su
// propio saldo disponible, solo que en su propia pantalla/línea de Home,
// no aquí).
interface GoalCardProps {
  goal: ActiveGoal | undefined;
}

export function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();

  if (goal) {
    return <ActiveGoalCard goal={goal} onCancelled={() => router.refresh()} />;
  }

  return <CreateGoalForm onCreated={() => router.refresh()} />;
}

// Mini-fix (checkpoint post-Bloque 1) — cierra el gap detectado: el
// backend de cancelación (`cancelGoalAction`/`cancelGoal()`) ya existía y
// estaba probado, pero ningún componente lo invocaba. La cancelación
// SIEMPRE pasa por `cancelGoalAction` (Server Action -> `cancelGoal()`),
// nunca un UPDATE directo desde este componente — la UI no es la
// autoridad, solo dispara la acción ya validada server-side.
function ActiveGoalCard({
  goal,
  onCancelled,
}: {
  goal: ActiveGoal;
  onCancelled: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const progressPercent = calculateGoalProgressPercent(goal.earnedPoints, goal.targetPoints);

  // P14.4-F (F4) — `goal.justCompleted` es `true` únicamente en la
  // petición exacta donde este Goal transicionó a 'completed' (garantía
  // del RPC `complete_goal_if_threshold_met()`, no de este componente).
  // Nunca vuelve a ser `true` para el mismo Goal en ninguna carga
  // posterior — ver el comentario de `ActiveGoal.justCompleted`
  // (lib/goals/get-goal.ts) para el porqué exacto.
  if (goal.justCompleted) {
    return <GoalCompletedCard title={goal.title} />;
  }

  async function handleCancel() {
    setIsCancelling(true);
    setError(undefined);
    try {
      const result = await cancelGoalAction(goal.id);
      if (result.outcome === "success" || result.outcome === "not_found") {
        onCancelled();
        return;
      }
      setError(t("goals.cancelError"));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("goals.myGoalTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Bloque Premium Design System V1 (Fase B) — "Goal = propósito":
            el destino gana peso visual (text-lg -> text-xl,
            tracking-tight) para ser el protagonista de la card, tal como
            pide VIAO_PREMIUM_DESIGN_UX_V1.md sección 12. Ningún cambio de
            dato: sigue siendo `goal.title` tal cual.
            Micro-bloque 2 (Home Beta) — Goal ya no comparte fila con
            Missions (ver app/page.tsx): con más espacio propio, el
            destino sube otro escalón (text-xl -> text-2xl) para reforzar
            "esto es lo que estoy construyendo". */}
        <p className="text-2xl font-semibold tracking-tight">{goal.title}</p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            {/* P14.4-E — `goals.availableLabel` ("Disponible ahora") ya
                no describe correctamente esta cifra (ahora es "lo
                ganado hacia este objetivo", no "lo disponible para
                gastar" — ese dato vive en Wallet). Se usa
                `goals.earnedLabel` ("Ganado para tu objetivo"), clave
                que ya existía en el i18n desde el modelo híbrido
                original y había quedado sin usar — ver
                VIAO_P14_4_E_P0_IMPLEMENTATION.md. */}
            <span className="text-muted-foreground">{t("goals.earnedLabel")}</span>
            <span className="font-medium text-success">
              {goal.earnedPoints} / {goal.targetPoints} {t("rewards.pointsUnit")}
            </span>
          </div>
          {/* Bloque Premium Design System V1 (Fase B) — sustituye el
              `div` + `width` inline (Fase A) por la primitiva accesible
              `Progress` (`components/ui/progress.tsx`): mismo lenguaje
              visual exacto (h-2, rounded-full, bg-muted/bg-success), pero
              ahora con role="progressbar" + aria-valuenow/min/max reales.
              `progressPercent` (WALLET_BALANCE, calculateGoalProgressPercent)
              no cambia — solo cambia la representación visual. */}
          <Progress value={progressPercent} />
          {/* UX-3 (World-Class Core Screen Design) — hallazgo de la
              auditoría: acumulado y objetivo ya eran visibles arriba,
              pero el porcentaje (pedido explícitamente por el brief:
              "Points acumulados, Points restantes, porcentaje") solo
              existía como el ancho de relleno de la barra — nunca como
              número. Mismo `progressPercent` ya calculado, ningún cálculo
              nuevo; mono/tabular, mismo criterio numérico de UX-2. */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("goals.progressMotivation")}</p>
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-success">
              {progressPercent}%
            </span>
          </div>
        </div>

        {confirmingCancel ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{t("goals.cancelConfirmTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("goals.cancelConfirmMessage")}</p>
            {error && <ErrorState message={error} className="p-0 text-left items-start" />}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={isCancelling}
                onClick={handleCancel}
              >
                {isCancelling ? t("goals.cancelling") : t("goals.cancelConfirmCta")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isCancelling}
                onClick={() => {
                  setConfirmingCancel(false);
                  setError(undefined);
                }}
              >
                {t("goals.cancelBackCta")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-xs text-muted-foreground"
            onClick={() => setConfirmingCancel(true)}
          >
            {t("goals.cancelCta")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// P14.4-F (F4) — celebración de Goal completado. Reutiliza el lenguaje
// visual/técnico ya establecido para el único otro "momento celebrate"
// del sistema (`motion-safe:animate-celebrate`, `CheckCircle2`, colores
// `success` — mismo tratamiento que `app/rewards/reward-catalog.tsx` al
// canjear un Reward). Mismo `Card` que `ActiveGoalCard`/`CreateGoalForm`
// (misma posición en Home, sin pantalla nueva). Sin CTA que reactive
// nada: "Crear nuevo objetivo" solo refresca la ruta — en la siguiente
// carga, `getActiveGoal()` ya no encuentra ningún Goal 'active' (este ya
// es 'completed') y `GoalCard` renderiza `CreateGoalForm` de forma
// natural, sin ningún estado nuevo que gestionar aquí.
function GoalCompletedCard({ title }: { title: string }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="motion-safe:animate-celebrate flex flex-col items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-5 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          <p className="text-lg font-semibold">{t("goals.completedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("goals.completedMessage")}</p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          {t("goals.completedNewGoalCta")}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateGoalForm({ onCreated }: { onCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("goals.myGoalTitle")}</CardTitle>
          {/* Bloque Claridad de producto V1 — mismo patrón que la card de
              Vision/Missions en Home: explica en una línea qué es un
              Goal antes de crear uno, para quien saltó el onboarding. */}
          <CardDescription>{t("goals.createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            {t("goals.createCta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("goals.createCta")}</CardTitle>
      </CardHeader>
      <CardContent>
        <GoalForm onCreated={onCreated} />
      </CardContent>
    </Card>
  );
}

// Fase 1 (onboarding del Goal) — extraído de `CreateGoalForm` para que
// Home (arriba) y `app/onboarding/page.tsx` compartan exactamente la
// misma lógica de creación (validación, llamada a `createGoalAction`,
// manejo de errores) — nunca una segunda implementación. Sin `Card`
// propia: cada contexto decide su propio envoltorio visual.
export function GoalForm({ onCreated, submitLabel }: { onCreated: () => void; submitLabel?: string }) {
  const [title, setTitle] = useState("");
  const [targetPoints, setTargetPoints] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);

    const parsedTarget = Number(targetPoints);
    if (!title.trim() || !(parsedTarget > 0)) {
      setError(t("goals.validationError"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createGoalAction({
        title: title.trim(),
        targetPoints: parsedTarget,
        targetDate: targetDate || undefined,
      });
      if (result.outcome === "success") {
        // P14.4-F (F3) — `pointsEarned` solo viene relleno la primera vez
        // real que este usuario completa "goal_created" (ver el
        // comentario de create-goal.ts) — nunca en el segundo/tercer
        // Goal que cree.
        if (result.pointsEarned) {
          announcePointsEarned(result.pointsEarned, "goals.pointsEarnedToastLabel");
        }
        onCreated();
      } else if (result.outcome === "already_has_active_goal") {
        setError(t("goals.alreadyHasActiveGoal"));
      } else {
        setError(t("goals.createError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        placeholder={t("goals.titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        type="number"
        min={1}
        placeholder={t("goals.targetPlaceholder")}
        value={targetPoints}
        onChange={(e) => setTargetPoints(e.target.value)}
      />
      <Input
        type="date"
        aria-label={t("onboarding.dateOptional")}
        placeholder={t("onboarding.dateOptional")}
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("goals.creating") : (submitLabel ?? t("goals.createCta"))}
      </Button>
    </form>
  );
}
