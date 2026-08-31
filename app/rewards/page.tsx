import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { EmptyState } from "@/components/state/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getWalletBalance } from "../../lib/rewards/get-wallet-balance";
import { getRewardTransactions } from "../../lib/rewards/get-reward-transactions";
import { getRewardsCatalog } from "../../lib/rewards/get-rewards-catalog";
import { getRewardRedemptions, type RewardRedemptionView } from "../../lib/rewards/get-reward-redemptions";
import { RewardCatalog } from "./reward-catalog";

// FASE UX-1.1 (Core UX Quick-Fix Pass, P0-8) — mismo patrón que
// REASON_LABEL_KEY de abajo, para el estado de una redención.
const REDEMPTION_STATUS_KEY: Record<RewardRedemptionView["status"], TranslationKey> = {
  pending: "rewards.redemptions.statusPending",
  fulfilled: "rewards.redemptions.statusFulfilled",
  cancelled: "rewards.redemptions.statusCancelled",
};

const REDEMPTION_STATUS_BADGE_VARIANT: Record<RewardRedemptionView["status"], "success" | "outline" | "destructive"> = {
  pending: "outline",
  fulfilled: "success",
  cancelled: "destructive",
};

// F7-03 (VIAO_ROADMAP.md) — UI de Wallet. Server Component, mismo patrón
// que app/booking/[propertyId]/status/page.tsx (F6-05): obtiene los datos
// exclusivamente vía lib/rewards/, sin ninguna lógica de Supabase aquí.
//
// Ownership: `getWalletBalance()`/`getRewardTransactions()` usan el
// cliente de SESIÓN (nunca `service_role`) — RLS
// (`rewards_transactions_select_own`) ya garantiza que un usuario nunca
// pueda ver el ledger de otro, sin necesidad de comprobarlo aquí.
//
// Sin sesión: `getWalletBalance()` distingue explícitamente "sin acceso"
// (`undefined`) de "saldo real 0" — aquí se trata como el mismo patrón ya
// establecido en F6-05 para /booking/[propertyId]/status: un estado de
// "inicia sesión" en vez de datos privados, sin tocar
// `lib/supabase/middleware.ts` (mismo mecanismo, sin introducir uno nuevo).
const REASON_LABEL_KEY: Record<string, TranslationKey> = {
  registration: "rewards.reasonRegistration",
  booking: "rewards.reasonBooking",
  referral: "rewards.reasonReferral",
  redemption: "rewards.reasonRedemption",
  redemption_refund: "rewards.reasonRedemptionRefund",
};

/** Reutiliza la etiqueta amigable si el `reason` es uno de los documentados (VIAO_DATABASE.md sección 7); si no, muestra el valor real tal cual — nunca oculta un motivo desconocido. */
function formatReason(reason: string): string {
  const key = REASON_LABEL_KEY[reason];
  return key ? t(key) : reason;
}

export default async function RewardsPage() {
  const balance = await getWalletBalance();

  if (balance === undefined) {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <ErrorState
            title={t("rewards.unauthenticatedTitle")}
            message={t("rewards.unauthenticatedMessage")}
            action={
              <Link
                href="/login"
                className={buttonVariants({ variant: "default" })}
              >
                {t("rewards.loginCta")}
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  const transactions = await getRewardTransactions();
  const catalog = await getRewardsCatalog();
  const redemptions = await getRewardRedemptions();

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-6 p-6">
        <h1 className="text-xl font-semibold">{t("rewards.pageTitle")}</h1>

        {/* Bloque 1 (VIAO_V1_LOOP_DECISION.md) — catálogo + canje, antes
            del historial: cierra el loop "Points -> Elige -> Reward". */}
        <RewardCatalog catalog={catalog} walletBalance={balance} />

        {/* FASE UX-1.1 (Core UX Quick-Fix Pass, P0-8) — historial de
            canjes: hasta ahora el código de canje solo se mostraba una
            vez, en la propia pantalla de confirmación (reward-catalog.tsx),
            sin ningún sitio donde recuperarlo después. `redemption_code`
            ya se persistía en `reward_redemptions` desde siempre — esta
            sección solo lo expone. */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rewards.redemptions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {redemptions.length === 0 ? (
              <EmptyState message={t("rewards.redemptions.emptyMessage")} />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {redemptions.map((redemption) => (
                  <li
                    key={redemption.id}
                    className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{redemption.rewardTitle}</span>
                      <Badge variant={REDEMPTION_STATUS_BADGE_VARIANT[redemption.status]}>
                        {t(REDEMPTION_STATUS_KEY[redemption.status])}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      {/* UX-2 (World-Class Product Design) — Fase F: el
                          código de canje es lo único en VIAO que funciona
                          como un objeto físico (un ticket que se enseña en
                          el comercio) — se le da su propio chip con borde
                          y letter-spacing, en vez de texto mono inline
                          indistinguible del resto de la fila. */}
                      <span className="flex items-center gap-1.5">
                        <span className="sr-only">{t("rewards.redeem.codeLabel")}: </span>
                        <span className="rounded-md border border-border bg-muted px-2 py-1 font-mono font-medium tracking-wider text-foreground">
                          {redemption.redemptionCode}
                        </span>
                      </span>
                      <span>{redemption.createdAt.slice(0, 10)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("rewards.balanceLabel")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 py-2">
            <p className="text-3xl font-semibold text-success">
              {/* UX-2 (World-Class Product Design) — Fase B: mismo criterio
                  de font-mono + tabular-nums que Home/GoalCard/StatCard,
                  aplicado aquí al saldo más grande y visible de toda la
                  Wallet. */}
              <span className="font-mono tabular-nums">{balance}</span>{" "}
              <span className="text-base font-normal text-muted-foreground">
                {t("rewards.pointsUnit")}
              </span>
            </p>
            {/* Bloque Claridad de producto V1 — el disclaimer "no son
                dinero" ya existía en Home (`home.rewardsDisclaimer`), pero
                solo se muestra a usuarios sin ningún viaje todavía. La
                Wallet es el lugar durable donde siempre se puede consultar
                qué son los Points y cómo se ganan — complementa esa
                explicación, no la duplica. */}
            <p className="text-xs text-muted-foreground">
              {t("rewards.pointsExplainer")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("rewards.provisionalNote")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("rewards.historyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                title={t("rewards.emptyTitle")}
                message={t("rewards.emptyMessage")}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {transactions.map((transaction) => {
                  // Único mecanismo que existe hoy (F7-01, `createRewardTransaction`):
                  // `amount` siempre es positivo — no hay ningún flujo real de
                  // gasto/canje todavía. Se mantiene la comparación `> 0` (idéntica
                  // a la ya existente antes de este bloque) para que, si algún día
                  // se implementa un `type: "spent"` real, el tratamiento negativo
                  // ya esté correctamente en su sitio sin tocar esta pantalla otra
                  // vez — no se inventa ningún dato ni caso de prueba para ello.
                  const isPositive = transaction.amount > 0;
                  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

                  return (
                    <li
                      key={transaction.id}
                      className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          isPositive
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive",
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {formatReason(transaction.reason)}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-sm font-semibold tabular-nums",
                              isPositive ? "text-success" : "text-destructive",
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {transaction.amount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{transaction.createdAt.slice(0, 10)}</span>
                          {transaction.referenceId && (
                            <span className="break-all">
                              {t("rewards.referenceLabel")}: {transaction.referenceId}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
