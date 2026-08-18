import { logAnalyticsEvent } from "../analytics/log-event";

// F9-04 (VIAO_ROADMAP.md) — Logging de consumo, centralizado en
// lib/openai/ (ver también F9-05: aquí se registra también el rechazo
// por kill switch). "El logging debe ocurrir desde el wrapper — no
// permitir que cada consumidor implemente su propio logging": por eso
// esta función, no un insert directo, es lo único que
// app/search/ai-recommendation/actions.ts (F9-02) y
// lib/openai/index.ts llaman para dejar constancia de un intento.
//
// Reutiliza analytics_events/"recommendation_requested"
// (F5-05/F3-07): ya reservado en la taxonomía cerrada específicamente
// para esto (VIAO_ARCHITECTURE.md sección 23: "para poder auditar el
// gasto frente al presupuesto de pruebas de 20-50€") — no se crea una
// tabla nueva solo para esto. `logAnalyticsEvent` sigue siendo el ÚNICO
// escritor real de esa tabla (F5-05); esta función nunca inserta
// directamente.
//
// Se registra CADA intento — éxito, error de OpenAI, bloqueado por rate
// limit, bloqueado por el kill switch — no solo las llamadas reales, para
// poder demostrar qué queda registrado en cada uno de los cuatro casos
// (requisito explícito de la fase). Solo "success"/"provider_error"
// corresponden a una llamada REAL a OpenAI; "rate_limited"/"disabled"
// nunca llevan tokens/coste porque nunca se llegó a invocar al
// proveedor.
//
// Nunca se guarda: OPENAI_API_KEY (no forma parte de este tipo), ni el
// prompt/contexto completo — solo metadatos estructurales
// (`resultsUsedCount`, nunca el texto/precio literal de los resultados) —
// cumple "no guardar datos innecesariamente sensibles".
export type AiRecommendationOutcome =
  | "success"
  | "provider_error"
  | "rate_limited"
  | "disabled";

export interface LogAiRecommendationOutcomeInput {
  endpoint: string;
  searchId?: string;
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  estimatedCostUsd?: number;
  outcome: AiRecommendationOutcome;
  requestId?: string;
  errorMessage?: string;
  resultsUsedCount?: number;
}

export async function logAiRecommendationOutcome(
  input: LogAiRecommendationOutcomeInput,
): Promise<void> {
  await logAnalyticsEvent("recommendation_requested", { ...input });
}

// F10-02/F10-03 (VIAO_ROADMAP.md) — mismo mecanismo que
// `logAiRecommendationOutcome` (F9-04), pero para VIAO Vision: reutiliza
// `analytics_events`/"vision_used" (F3-07, ya reservado en la taxonomía
// cerrada específicamente para esto) en vez de crear un segundo sistema
// de logging paralelo. Mismas reglas: se registra CADA intento (éxito,
// error, bloqueado por rate limit, bloqueado por kill switch, sin
// consentimiento), nunca la imagen ni el texto completo del resultado —
// solo metadatos estructurales.
export type VisionOutcome =
  | "success"
  | "provider_error"
  | "rate_limited"
  | "disabled"
  | "no_consent";

export interface LogVisionOutcomeInput {
  endpoint: string;
  scanId?: string;
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  estimatedCostUsd?: number;
  outcome: VisionOutcome;
  requestId?: string;
  errorMessage?: string;
}

export async function logVisionOutcome(
  input: LogVisionOutcomeInput,
): Promise<void> {
  await logAnalyticsEvent("vision_used", { ...input });
}
