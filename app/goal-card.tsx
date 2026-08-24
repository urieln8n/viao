"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { createGoalAction, cancelGoalAction } from "./goals/actions";
import type { ActiveGoal } from "../lib/goals/get-goal";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — sección mínima de Goal en Home.
// Regla explícita del bloque: SIEMPRE dos cifras separadas, nunca
// presentadas como si fueran lo mismo — "Ganado para tu objetivo"
// (`goal.earnedTowardGoal`, solo avanza) vs "Disponible ahora"
// (`walletBalance`, el saldo real gastable, que SÍ puede bajar al
// canjear un Reward).
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

  const progressPercent = Math.min(100, Math.round((goal.earnedTowardGoal / goal.targetPoints) * 100));

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
            <span className="text-muted-foreground">{t("goals.earnedLabel")}</span>
            <span className="font-medium">
              {goal.earnedTowardGoal} / {goal.targetPoints} {t("rewards.pointsUnit")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("goals.availableLabel")}</span>
          <span className="font-medium text-success">
            {walletBalance} {t("rewards.pointsUnit")}
          </span>
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
  const [title, setTitle] = useState("");
  const [targetPoints, setTargetPoints] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const result = await createGoalAction({ title: title.trim(), targetPoints: parsedTarget });
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
    <Card>
      <CardHeader>
        <CardTitle>{t("goals.createCta")}</CardTitle>
      </CardHeader>
      <CardContent>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("goals.creating") : t("goals.createCta")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
