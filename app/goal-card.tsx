"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { createGoalAction, cancelGoalAction } from "./goals/actions";
import type { ActiveGoal } from "../lib/goals/get-goal";
import { calculateGoalProgressPercent } from "../lib/goals/calculate-progress";

// Bloque Goals V1 (VIAO_GOALS_V1_DECISION_LOCK.md, GOAL_PROGRESS_MODEL=
// WALLET_BALANCE) — sección mínima de Goal en Home. Una única cifra de
// progreso: `walletBalance` (Points disponibles ahora) sobre
// `goal.targetPoints` — ya NO se muestran dos cifras separadas ("Ganado
// para tu objetivo" vs "Disponible ahora"), porque bajo este modelo son
// literalmente el mismo número. Canjear un Reward SÍ reduce visiblemente
// este progreso (consecuencia real de la bifurcación GUARDAR/REDEEM del
// loop V1); un refund lo devuelve, sin ningún caso especial.
interface GoalCardProps {
  goal: ActiveGoal | undefined;
  walletBalance: number;
}

export function GoalCard({ goal, walletBalance }: GoalCardProps) {
  const router = useRouter();

  if (goal) {
    return <ActiveGoalCard goal={goal} walletBalance={walletBalance} onCancelled={() => router.refresh()} />;
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
  walletBalance,
  onCancelled,
}: {
  goal: ActiveGoal;
  walletBalance: number;
  onCancelled: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const progressPercent = calculateGoalProgressPercent(walletBalance, goal.targetPoints);

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
        <p className="text-lg font-semibold">{goal.title}</p>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("goals.availableLabel")}</span>
            <span className="font-medium text-success">
              {walletBalance} / {goal.targetPoints} {t("rewards.pointsUnit")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {confirmingCancel ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{t("goals.cancelConfirmTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("goals.cancelConfirmMessage")}</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
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

function CreateGoalForm({ onCreated }: { onCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("goals.myGoalTitle")}</CardTitle>
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
