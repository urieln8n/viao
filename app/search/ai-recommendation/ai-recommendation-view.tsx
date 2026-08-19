"use client";

import { useState, useTransition } from "react";
import { Brain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import {
  requestAiRecommendationAction,
  type AiRecommendationActionResult,
} from "./actions";

// F9-02 (VIAO_ROADMAP.md) — Único punto de la app que invoca
// `requestAiRecommendationAction`. Solo envía `searchId` (recibido como
// prop, ya validado/propagado por `page.tsx` desde la query string) — el
// cliente nunca construye ni envía ningún otro dato de contexto.
//
// Bloque 19 ("Identidad visual") — presentación rediseñada para que VIAO
// AI se sienta como una herramienta propia de VIAO, no "un botón que
// llama a una función": Card dedicada, icono + naranja de marca
// (--viao-orange, app/globals.css), resultado en un bloque visualmente
// diferenciado. `requestAiRecommendationAction` y el resto de la lógica
// (contratos, datos, server action) sin ningún cambio.
function errorMessageFor(result: AiRecommendationActionResult): string | undefined {
  switch (result.status) {
    case "unauthenticated":
      return t("aiRecommendation.errorUnauthenticated");
    case "invalid_search_id":
      return t("aiRecommendation.errorInvalidSearchId");
    case "search_not_found":
      return t("aiRecommendation.errorSearchNotFound");
    case "rate_limited":
      return t("aiRecommendation.errorRateLimited");
    case "ai_disabled":
      return t("aiRecommendation.errorDisabled");
    case "provider_error":
      return result.message;
    default:
      return undefined;
  }
}

export function AiRecommendationView({ searchId }: { searchId: string }) {
  const [result, setResult] = useState<AiRecommendationActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const actionResult = await requestAiRecommendationAction(searchId);
      setResult(actionResult);
    });
  }

  const message = result ? errorMessageFor(result) : undefined;

  return (
    <Card className="border-viao-orange/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-viao-orange" aria-hidden="true" />
          {t("aiRecommendation.title")}
        </CardTitle>
        <CardDescription>{t("aiRecommendation.tagline")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button onClick={handleClick} disabled={isPending}>
          {isPending
            ? t("aiRecommendation.requestButtonLoading")
            : t("aiRecommendation.requestButton")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("aiRecommendation.description")}
        </p>

        {result?.status === "success" && (
          <div className="flex flex-col gap-1 rounded-lg bg-accent p-4">
            <span className="text-xs font-medium text-viao-orange">
              {t("aiRecommendation.resultTitle")}
            </span>
            <p role="status" className="text-sm whitespace-pre-wrap">
              {result.recommendation}
            </p>
          </div>
        )}
        {message && <ErrorState message={message} />}
      </CardContent>
    </Card>
  );
}
