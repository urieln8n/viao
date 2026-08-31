"use client";

import { useState, type FormEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { registerQrActivityAction, registerReservationActivityAction } from "../../actions";
import { parsePartnerAmountInput } from "../../../../lib/partners/parse-amount-input";
import type { PartnerAccessContext } from "../../../../lib/partners/resolve-partner-access";

// Bloque Partners PB5 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — UI
// operativa mínima: seleccionar flujo (QR/Reserva) -> introducir importe
// -> resultado. Mismo patrón de máquina de estados (`ViewState` con
// discriminante `step`) ya usado en app/rewards/reward-catalog.tsx, y
// mismo criterio de traducción de outcome->mensaje vía tabla (
// `ERROR_MESSAGE_KEY`) que ese mismo archivo.
//
// NUNCA calcula Points ni conoce P1/P2 — solo muestra
// `result.activity.pointsAwarded`, el valor que ya decidió el RPC de PB2
// vía las Server Actions de PB4. El caso `pointsAwarded === 0` (pool
// mensual agotado, P5, LOCKED) se renderiza en la MISMA rama de éxito que
// cualquier otro resultado — nunca en la rama de error: la Actividad se
// registró correctamente, es un resultado válido, no un fallo.
type Flow = "qr" | "reservation";

type ViewState =
  | { step: "select" }
  | { step: "form"; flow: Flow }
  | { step: "result"; pointsAwarded: number }
  | { step: "error"; message: string };

const ERROR_MESSAGE_KEY: Record<string, TranslationKey> = {
  invalid_amount: "partnerOps.errorInvalidAmount",
  partner_access_denied: "partnerOps.errorPartnerDenied",
  daily_limit_exceeded: "partnerOps.errorDailyLimit",
  unauthenticated: "partnerOps.errorUnauthenticated",
};

interface PartnerOpsViewProps {
  partner: PartnerAccessContext;
  accessToken: string;
}

export function PartnerOpsView({ partner, accessToken }: PartnerOpsViewProps) {
  const [view, setView] = useState<ViewState>({ step: "select" });
  const [amount, setAmount] = useState("");
  const [reservationReference, setReservationReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetToStart() {
    setAmount("");
    setReservationReference("");
    setView({ step: "select" });
  }

  async function handleSubmit(event: FormEvent, flow: Flow) {
    event.preventDefault();
    const declaredAmountEur = parsePartnerAmountInput(amount);
    if (declaredAmountEur === undefined) {
      setView({ step: "error", message: t("partnerOps.errorInvalidAmount") });
      return;
    }

    setIsSubmitting(true);
    try {
      const attemptId = crypto.randomUUID();
      const result =
        flow === "qr"
          ? await registerQrActivityAction(accessToken, attemptId, declaredAmountEur)
          : await registerReservationActivityAction(
              accessToken,
              attemptId,
              declaredAmountEur,
              reservationReference.trim() || undefined,
            );

      if (result.outcome === "registered") {
        setView({ step: "result", pointsAwarded: result.activity.pointsAwarded });
        return;
      }

      const key = ERROR_MESSAGE_KEY[result.outcome];
      setView({ step: "error", message: key ? t(key) : t("partnerOps.errorGeneric") });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view.step === "result") {
    const hasPoints = view.pointsAwarded > 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("partnerOps.resultTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hasPoints ? (
            <p className="text-lg font-semibold text-success">
              {t("partnerOps.resultPointsAwarded")}:{" "}
              <span className="font-mono tabular-nums">{view.pointsAwarded}</span> {t("rewards.pointsUnit")}
            </p>
          ) : (
            <>
              <p className="text-lg font-semibold">{t("partnerOps.resultRegisteredNoPoints")}</p>
              <p className="text-sm text-muted-foreground">{t("partnerOps.resultNoPointsExplanation")}</p>
            </>
          )}
          <Button variant="outline" onClick={resetToStart}>
            {t("partnerOps.backToStart")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view.step === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("partnerOps.errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-destructive">{view.message}</p>
          <Button variant="outline" onClick={resetToStart}>
            {t("partnerOps.backToStart")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view.step === "form") {
    const { flow } = view;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{flow === "qr" ? t("partnerOps.qrFormTitle") : t("partnerOps.reservationFormTitle")}</CardTitle>
          <CardDescription>{partner.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => handleSubmit(event, flow)} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("partnerOps.amountLabel")}
              <Input
                type="text"
                inputMode="decimal"
                placeholder={t("partnerOps.amountPlaceholder")}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            {flow === "reservation" && (
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t("partnerOps.reservationReferenceLabel")}
                <Input
                  type="text"
                  placeholder={t("partnerOps.reservationReferencePlaceholder")}
                  value={reservationReference}
                  onChange={(event) => setReservationReference(event.target.value)}
                  disabled={isSubmitting}
                />
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("partnerOps.submitting") : t("partnerOps.submitCta")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setView({ step: "select" })}
              >
                {t("partnerOps.backCta")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{partner.name}</CardTitle>
        <CardDescription>{t("partnerOps.selectFlowDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={() => setView({ step: "form", flow: "qr" })}>{t("partnerOps.qrCta")}</Button>
        <Button variant="outline" onClick={() => setView({ step: "form", flow: "reservation" })}>
          {t("partnerOps.reservationCta")}
        </Button>
      </CardContent>
    </Card>
  );
}
