"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-4">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending
          ? t("aiRecommendation.requestButtonLoading")
          : t("aiRecommendation.requestButton")}
      </Button>

      {result?.status === "success" && (
        <p role="status" className="text-sm whitespace-pre-wrap">
          {result.recommendation}
        </p>
      )}
      {message && <ErrorState message={message} />}
    </div>
  );
}
