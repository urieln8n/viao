import OpenAI from "openai";
import { getOpenAiTimeoutMs } from "./config";

// F9-01 (VIAO_ROADMAP.md) — Único punto de todo el proyecto que construye
// un cliente OpenAI (`new OpenAI(...)`). Ningún componente cliente, Server
// Action ni ningún otro módulo debe importar el paquete `openai`
// directamente — verificado por grep en la auditoría final de la fase.
//
// Singleton perezoso: OPENAI_API_KEY no se lee hasta la primera llamada
// real (dentro de generateSearchRecommendation, tras superar el kill
// switch de F9-05) — así, build/tsc/tests que nunca invocan la IA no
// requieren la variable configurada.
let cachedClient: OpenAI | undefined;

export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está configurada — VIAO AI no puede llamar a OpenAI sin ella.",
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, timeout: getOpenAiTimeoutMs() });
  }
  return cachedClient;
}
