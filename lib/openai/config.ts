// F9-01/F9-05 (VIAO_ROADMAP.md) — Configuración centralizada del wrapper
// de OpenAI (VIAO_ARCHITECTURE.md sección 23). Único punto del proyecto
// que lee OPENAI_MODEL/OPENAI_TIMEOUT_MS/AI_RECOMMENDATIONS_ENABLED —
// nada fuera de lib/openai/ debe leer estas variables directamente.
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 15_000;

/** Modelo PROVISIONAL/CONFIGURABLE (MVP sección 18: sin proveedor de IA fijado todavía) — cambiar aquí, o vía OPENAI_MODEL. */
export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function getOpenAiTimeoutMs(): number {
  const raw = process.env.OPENAI_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * Interruptor de emergencia (F9-05). Fail-closed por diseño, mismo
 * criterio que la autenticación fail-closed de F6 (VIAO_ROADMAP.md):
 * cualquier valor distinto de la cadena exacta "true" (variable ausente,
 * vacía, "false", cualquier otro texto) se interpreta como deshabilitado
 * — un despliegue que se olvide de fijar esta variable nunca genera
 * coste de OpenAI por accidente. Se evalúa server-side en cada llamada
 * (sin caché): el cliente no puede sobrescribirlo bajo ninguna
 * circunstancia porque nunca llega al navegador.
 */
export function isAiRecommendationsEnabled(): boolean {
  return process.env.AI_RECOMMENDATIONS_ENABLED === "true";
}

/**
 * Interruptor de emergencia de VIAO Vision (F10-05), independiente del de
 * recomendaciones — VIAO_ARCHITECTURE.md sección 23 nombra Vision
 * explícitamente como ejemplo de "función costosa" que debe poder
 * desactivarse por separado. Mismo criterio fail-closed que
 * `isAiRecommendationsEnabled`.
 */
export function isVisionEnabled(): boolean {
  return process.env.VISION_ENABLED === "true";
}

/**
 * Precios USD por 1M tokens — únicamente los modelos que VIAO usa
 * realmente. El resultado de `estimateCostUsd` es una ESTIMACIÓN para
 * controlar el presupuesto de pruebas (20-50€, MVP sección 18), nunca un
 * coste definitivo/facturable — VIAO_ARCHITECTURE.md sección 23.
 */
const KNOWN_MODEL_PRICING_USD_PER_1M_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
};

/** `undefined` si el modelo configurado no está en la tabla de precios conocida — nunca se inventa un número para un modelo desconocido. */
export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | undefined {
  const pricing = KNOWN_MODEL_PRICING_USD_PER_1M_TOKENS[model];
  if (!pricing) {
    return undefined;
  }
  return (
    (promptTokens * pricing.input + completionTokens * pricing.output) /
    1_000_000
  );
}
