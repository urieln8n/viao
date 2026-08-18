import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { EmptyState } from "@/components/state/empty-state";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getWalletBalance } from "../../lib/rewards/get-wallet-balance";
import { getRewardTransactions } from "../../lib/rewards/get-reward-transactions";

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
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
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
      </main>
    );
  }

  const transactions = await getRewardTransactions();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("rewards.pageTitle")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.balanceLabel")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-3xl font-semibold">
            {balance}{" "}
            <span className="text-base font-normal text-muted-foreground">
              {t("rewards.pointsUnit")}
            </span>
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
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {formatReason(transaction.reason)}
                    </span>
                    <span
                      className={
                        transaction.amount > 0
                          ? "text-sm font-semibold text-primary"
                          : "text-sm font-semibold text-destructive"
                      }
                    >
                      {transaction.amount > 0 ? "+" : ""}
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
