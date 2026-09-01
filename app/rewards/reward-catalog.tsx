"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/empty-state";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { redeemRewardAction } from "./actions";
import type { RewardCatalogEntry } from "../../lib/rewards/get-rewards-catalog";
import type { RedeemRewardResult } from "../../lib/rewards/redeem-reward";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — flujo mínimo de canje: catálogo
// -> confirmación -> canje -> resultado con código. Sin construir un
// sistema de búsqueda/categorías/favoritos/reviews — 10-20 Rewards caben
// sin necesitarlo.
interface RewardCatalogProps {
  catalog: RewardCatalogEntry[];
  walletBalance: number;
}

type ViewState =
  | { step: "list" }
  | { step: "confirm"; reward: RewardCatalogEntry }
  | { step: "result"; redemption: RedeemRewardResult; reward: RewardCatalogEntry }
  | { step: "error"; message: string };

const ERROR_MESSAGE_KEY: Record<string, TranslationKey> = {
  reward_not_available: "rewards.redeem.errorNotAvailable",
  limit_per_user_exceeded: "rewards.redeem.errorLimitExceeded",
  insufficient_balance: "rewards.redeem.errorInsufficientBalance",
  pool_exhausted: "rewards.redeem.errorPoolExhausted",
};

export function RewardCatalog({ catalog, walletBalance }: RewardCatalogProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ step: "list" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (catalog.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.catalog.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={t("rewards.catalog.emptyTitle")}
            message={t("rewards.catalog.emptyMessage")}
          />
        </CardContent>
      </Card>
    );
  }

  if (view.step === "result") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.redeem.resultTitle")}</CardTitle>
        </CardHeader>
        {/* UX-2 (World-Class Product Design) — Fase F: el único momento de
            celebración con "overshoot" (--animate-celebrate,
            app/globals.css) de todo VIAO — el propio brief lo señala como
            uno de los momentos más importantes del producto. Se anima el
            bloque del código (lo que el usuario realmente vino a buscar),
            no toda la Card ni el layout alrededor — breve, contenido,
            nunca infantil. `motion-safe:` (variante nativa de Tailwind)
            respeta `prefers-reduced-motion` sin código adicional: con
            movimiento reducido, el bloque aparece directamente, sin
            salto ni parpadeo. Ningún cambio de datos: mismo
            `redeemRewardAction`, mismo `RedeemRewardResult`. */}
        <CardContent className="flex flex-col gap-3">
          <p className="text-lg font-semibold">{view.reward.title}</p>
          <div className="motion-safe:animate-celebrate flex flex-col items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-5 text-center">
            <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{t("rewards.redeem.codeLabel")}</p>
            <p className="rounded-md border border-border bg-card px-4 py-2 font-mono text-2xl font-semibold tracking-wider">
              {view.redemption.redemptionCode}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{t("rewards.redeem.codeInstructions")}</p>
          <Button
            variant="outline"
            onClick={() => {
              setView({ step: "list" });
              router.refresh();
            }}
          >
            {t("rewards.redeem.backToCatalog")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view.step === "confirm") {
    const remaining = walletBalance - view.reward.pointsCost;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.redeem.confirmTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-lg font-semibold">{view.reward.title}</p>
          <p className="text-sm text-muted-foreground">
            {t("rewards.redeem.costLabel")}: <span className="font-mono tabular-nums">{view.reward.pointsCost}</span> {t("rewards.pointsUnit")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("rewards.redeem.remainingLabel")}: <span className="font-mono tabular-nums">{remaining}</span> {t("rewards.pointsUnit")}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                const attemptId = crypto.randomUUID();
                const result = await redeemRewardAction(view.reward.id, attemptId);
                setIsSubmitting(false);

                if (result.outcome === "success") {
                  setView({ step: "result", redemption: result.redemption, reward: view.reward });
                  return;
                }
                if (result.outcome === "unauthenticated") {
                  setView({ step: "error", message: t("rewards.unauthenticatedTitle") });
                  return;
                }
                const key = ERROR_MESSAGE_KEY[result.outcome];
                setView({
                  step: "error",
                  message: key ? t(key) : t("rewards.redeem.errorGeneric"),
                });
              }}
            >
              {isSubmitting
                ? t("rewards.redeem.redeeming")
                : `${t("rewards.redeem.confirmCta")} (${view.reward.pointsCost} ${t("rewards.pointsUnit")})`}
            </Button>
            <Button variant="outline" onClick={() => setView({ step: "list" })}>
              {t("rewards.redeem.cancelCta")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view.step === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.redeem.errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-destructive">{view.message}</p>
          <Button variant="outline" onClick={() => setView({ step: "list" })}>
            {t("rewards.redeem.backToCatalog")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rewards.catalog.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {catalog.map((reward) => {
            const canAfford = walletBalance >= reward.pointsCost;
            return (
              <li key={reward.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                {/* UX Pro Max V2 (P2.2) — mismo patrón defensivo ya usado en
                    el resto de filas equivalentes de la app (transacciones
                    de Wallet, teasers de Home/Missions/Partners): sin
                    flex-1 min-w-0 aquí, un título+descripción+partner largos
                    en un móvil estrecho podían comprimir o empujar el botón
                    de canje. Era la única fila de este tipo que le faltaba. */}
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{reward.title}</span>
                  {reward.description && (
                    <span className="text-xs text-muted-foreground">{reward.description}</span>
                  )}
                  {/* UX-10 (Partners Visible + Discovery + Registration) —
                      §11: `partnerName` ya llegaba desde
                      getRewardsCatalog() pero nunca se renderizaba. Sin
                      convertir `partner_name` a una FK real: sigue siendo
                      texto libre, solo se muestra tal cual. */}
                  {reward.partnerName && (
                    <span className="text-xs text-muted-foreground">
                      {t("rewards.catalog.partnerLabel")}: {reward.partnerName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{reward.pointsCost}</span> {t("rewards.pointsUnit")}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={!canAfford}
                  onClick={() => setView({ step: "confirm", reward })}
                >
                  {canAfford ? t("rewards.catalog.redeemCta") : t("rewards.catalog.insufficientCta")}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
