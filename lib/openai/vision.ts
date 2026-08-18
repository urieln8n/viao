import { APIError } from "openai";
import { getOpenAiClient } from "./client";
import { getOpenAiModel, isVisionEnabled, estimateCostUsd } from "./config";
import { logVisionOutcome } from "./log";

// F10-02 (VIAO_ROADMAP.md) — Extensión MÍNIMA del wrapper único de F9-01
// para soportar VIAO Vision, en el mismo archivo/estilo que
// `generateSearchRecommendation` (lib/openai/index.ts): reutiliza
// `getOpenAiClient()` (mismo cliente, nunca uno segundo — auditado en
// lib/openai/audit.test.ts, que cubre todo el árbol y por tanto también
// este archivo sin cambios), `getOpenAiModel()` (mismo modelo
// configurado; gpt-4o-mini ya admite entrada multimodal, no se añade una
// variable de modelo separada solo para Vision) y `estimateCostUsd`
// (los tokens de imagen ya vienen incluidos en `usage.prompt_tokens` por
// la propia API de OpenAI, así que el cálculo existente no necesita
// cambios). Kill switch propio (`isVisionEnabled`, F10-05) — Vision y
// recomendación son "funciones costosas" independientes
// (VIAO_ARCHITECTURE.md sección 23), cada una desactivable por separado.
// Logging propio (`logVisionOutcome`, reutiliza analytics_events/
// "vision_used", F3-07) — mismas reglas de F9-04: se registra cada
// intento, nunca la imagen ni el resultado completo.
//
// MVP = una llamada por escaneo: sin function calling, sin streaming, sin
// pregunta de seguimiento (esa capacidad la menciona MVP sección 10 pero
// NINGÚN ítem F10-00→F10-05 la pide — fuera de alcance de esta fase,
// mismo criterio de disciplina de alcance que F9 "COST CONTROL").
const ENDPOINT = "vision_scan";
const MAX_COMPLETION_TOKENS = 500;

const SYSTEM_INSTRUCTIONS =
  "Eres VIAO Vision, un asistente que traduce texto detectado en una " +
  "imagen (carteles, menús, señales) y da una explicación breve de " +
  "contexto. Utiliza únicamente lo que sea visible en la imagen. Si no " +
  "detectas texto legible, dilo explícitamente. No inventes texto, " +
  "lugares ni información que no esté en la imagen. Responde en formato " +
  "JSON con exactamente tres claves: \"sourceLanguage\" (idioma detectado " +
  "en la imagen, código corto p. ej. \"en\"/\"fr\", o cadena vacía si no " +
  "se detecta), \"translatedText\" (la traducción, o cadena vacía si no " +
  "hay texto legible) y \"explanation\" (explicación breve de contexto).";

export interface GenerateVisionScanInput {
  /** `undefined`: la fila `vision_scans` todavía no existe en el momento de la llamada (se crea DESPUÉS, con el resultado) — ver app/vision/actions.ts. */
  scanId?: string;
  imageBase64: string;
  mimeType: string;
  targetLanguage: string;
}

export interface VisionScanOutput {
  sourceLanguage: string;
  translatedText: string;
  explanation: string;
}

export type GenerateVisionScanResult =
  | ({ status: "success" } & VisionScanOutput)
  | { status: "disabled" }
  | { status: "provider_error"; message: string };

function parseVisionResponse(content: string): VisionScanOutput | undefined {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (
      typeof parsed.sourceLanguage === "string" &&
      typeof parsed.translatedText === "string" &&
      typeof parsed.explanation === "string"
    ) {
      return {
        sourceLanguage: parsed.sourceLanguage,
        translatedText: parsed.translatedText,
        explanation: parsed.explanation,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function generateVisionScan({
  scanId,
  imageBase64,
  mimeType,
  targetLanguage,
}: GenerateVisionScanInput): Promise<GenerateVisionScanResult> {
  if (!isVisionEnabled()) {
    await logVisionOutcome({ endpoint: ENDPOINT, scanId, outcome: "disabled" });
    return { status: "disabled" };
  }

  const model = getOpenAiModel();

  try {
    // Único lugar del proyecto donde se ejecuta una llamada real a
    // OpenAI para Vision. Una llamada por escaneo (mismo criterio que
    // F9-01).
    const client = getOpenAiClient();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Idioma de destino de la traducción: ${targetLanguage}.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content?.trim();
    const tokensPrompt = completion.usage?.prompt_tokens;
    const tokensCompletion = completion.usage?.completion_tokens;
    const estimatedCostUsd =
      tokensPrompt !== undefined && tokensCompletion !== undefined
        ? estimateCostUsd(model, tokensPrompt, tokensCompletion)
        : undefined;

    const parsed = rawContent ? parseVisionResponse(rawContent) : undefined;

    if (!parsed) {
      await logVisionOutcome({
        endpoint: ENDPOINT,
        scanId,
        model,
        tokensPrompt,
        tokensCompletion,
        estimatedCostUsd,
        outcome: "provider_error",
        requestId: completion.id,
        errorMessage: "Respuesta del modelo vacía o con formato inesperado.",
      });
      return {
        status: "provider_error",
        message: "El modelo no devolvió un resultado válido.",
      };
    }

    await logVisionOutcome({
      endpoint: ENDPOINT,
      scanId,
      model,
      tokensPrompt,
      tokensCompletion,
      estimatedCostUsd,
      outcome: "success",
      requestId: completion.id,
    });

    return { status: "success", ...parsed };
  } catch (error) {
    if (error instanceof APIError) {
      await logVisionOutcome({
        endpoint: ENDPOINT,
        scanId,
        model,
        outcome: "provider_error",
        errorMessage: error.message,
      });
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }
}
