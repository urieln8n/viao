import { APIError } from "openai";
import { getOpenAiClient } from "./client";
import { getOpenAiModel, isAiRecommendationsEnabled, estimateCostUsd } from "./config";
import {
  buildRecommendationPrompt,
  type RecommendationContextItem,
} from "./build-prompt";
import { logAiRecommendationOutcome } from "./log";
import type { SearchParams } from "../../types/travel";

export type { RecommendationContextItem } from "./build-prompt";

// F9-01 (VIAO_ROADMAP.md) — ÚNICA puerta de entrada server-side a
// OpenAI. `generateSearchRecommendation` es la única función exportada
// pensada para consumidores fuera de lib/openai/ (app/search/
// ai-recommendation/actions.ts, F9-02) — el resto de este módulo
// (cliente, config, prompt, logging) es implementación interna.
//
// Centraliza aquí, en este único punto, TODO lo que pide la fase:
// modelo/timeout (config.ts), interruptor de emergencia (F9-05, primera
// comprobación, antes de construir cualquier cliente OpenAI), estimación
// de coste y logging (F9-04, log.ts) — un consumidor nunca decide nada
// de esto por su cuenta.
//
// Recibe el contexto YA construido server-side por el llamador (F9-02
// paso 6: "construir server-side el contexto... enviar únicamente ese
// contexto al wrapper") — este módulo no toca Supabase ni el
// TravelProvider, su única responsabilidad es la llamada a OpenAI en sí.
const ENDPOINT = "ai_recommendation";
const MAX_COMPLETION_TOKENS = 400;

export interface GenerateSearchRecommendationInput {
  searchId: string;
  searchParams: SearchParams;
  results: RecommendationContextItem[];
}

export type GenerateSearchRecommendationResult =
  | { status: "success"; recommendation: string }
  | { status: "disabled" }
  | { status: "provider_error"; message: string };

export async function generateSearchRecommendation({
  searchId,
  searchParams,
  results,
}: GenerateSearchRecommendationInput): Promise<GenerateSearchRecommendationResult> {
  if (!isAiRecommendationsEnabled()) {
    await logAiRecommendationOutcome({
      endpoint: ENDPOINT,
      searchId,
      outcome: "disabled",
      resultsUsedCount: results.length,
    });
    return { status: "disabled" };
  }

  const model = getOpenAiModel();
  const { system, user } = buildRecommendationPrompt({ searchParams, results });

  try {
    // Único lugar del proyecto donde se ejecuta una llamada real a
    // OpenAI. MVP = una llamada por recomendación: sin function calling,
    // sin streaming, sin llamadas múltiples (VIAO_ROADMAP.md, Fase 9,
    // "COST CONTROL").
    const client = getOpenAiClient();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.3,
    });

    const recommendation = completion.choices[0]?.message?.content?.trim();
    const tokensPrompt = completion.usage?.prompt_tokens;
    const tokensCompletion = completion.usage?.completion_tokens;
    const estimatedCostUsd =
      tokensPrompt !== undefined && tokensCompletion !== undefined
        ? estimateCostUsd(model, tokensPrompt, tokensCompletion)
        : undefined;

    if (!recommendation) {
      await logAiRecommendationOutcome({
        endpoint: ENDPOINT,
        searchId,
        model,
        tokensPrompt,
        tokensCompletion,
        estimatedCostUsd,
        outcome: "provider_error",
        requestId: completion.id,
        errorMessage: "Respuesta vacía del modelo.",
        resultsUsedCount: results.length,
      });
      return {
        status: "provider_error",
        message: "El modelo no devolvió ninguna recomendación.",
      };
    }

    await logAiRecommendationOutcome({
      endpoint: ENDPOINT,
      searchId,
      model,
      tokensPrompt,
      tokensCompletion,
      estimatedCostUsd,
      outcome: "success",
      requestId: completion.id,
      resultsUsedCount: results.length,
    });

    return { status: "success", recommendation };
  } catch (error) {
    // Mismo modelo que TravelProviderError en searchAction (F5-02): un
    // error reconocible del proveedor se devuelve como resultado
    // distinguible; cualquier otro error (no es de OpenAI) se relanza sin
    // ocultarlo.
    if (error instanceof APIError) {
      await logAiRecommendationOutcome({
        endpoint: ENDPOINT,
        searchId,
        model,
        outcome: "provider_error",
        errorMessage: error.message,
        resultsUsedCount: results.length,
      });
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }
}
