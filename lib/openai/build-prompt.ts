import type { SearchParams } from "../../types/travel";

// F9-02 (VIAO_ROADMAP.md) — Construcción del prompt, aislada como función
// PURA (sin I/O) para que sea testable de forma independiente, mismo
// criterio que `classifyBookingError`/`resolveBookingContext` (F6-01):
// lógica extraída de la Server Action/wrapper para poder probarla sin
// Supabase ni OpenAI reales.
//
// Contexto EXCLUSIVAMENTE los resultados reales que recibe como
// parámetro (nunca datos enviados libremente por el cliente, ver F9-02) —
// esta función no lee ninguna fuente de datos por su cuenta, solo formatea
// lo que ya le llega. La instrucción explícita "utiliza únicamente la
// información proporcionada... si no está disponible, dilo... no
// inventes datos" (F9-02) se incluye siempre, en cada llamada, como
// mensaje "system" — nunca es opcional ni se puede omitir desde fuera de
// este módulo.
export interface RecommendationContextItem {
  providerPropertyId: string;
  name: string;
  city?: string;
  country?: string;
  rating?: number;
  price?: { amount: number; currency: string };
}

export interface BuildRecommendationPromptInput {
  searchParams: SearchParams;
  results: RecommendationContextItem[];
}

export interface RecommendationPrompt {
  system: string;
  user: string;
}

export const RECOMMENDATION_SYSTEM_INSTRUCTIONS =
  "Eres el asistente de recomendaciones de VIAO. Utiliza únicamente la " +
  "información proporcionada en el contexto de esta conversación. Si la " +
  "información solicitada no está disponible en el contexto, dilo " +
  "explícitamente. No inventes hoteles, precios, disponibilidad, " +
  "valoraciones ni ninguna otra característica que no aparezca en el " +
  "contexto. Responde de forma útil pero breve.";

function formatResultLine(item: RecommendationContextItem, index: number): string {
  const parts = [`${index + 1}. ${item.name}`];
  if (item.city) parts.push(`ciudad: ${item.city}`);
  if (item.country) parts.push(`país: ${item.country}`);
  if (typeof item.rating === "number") parts.push(`valoración: ${item.rating}`);
  if (item.price) parts.push(`precio: ${item.price.amount} ${item.price.currency}`);
  return parts.join(" — ");
}

export function buildRecommendationPrompt({
  searchParams,
  results,
}: BuildRecommendationPromptInput): RecommendationPrompt {
  const resultsBlock =
    results.length === 0
      ? "No hay ningún resultado disponible para esta búsqueda."
      : results.map(formatResultLine).join("\n");

  const user = [
    `Destino: ${searchParams.destination}`,
    `Fechas: ${searchParams.checkIn} a ${searchParams.checkOut}`,
    `Huéspedes: ${searchParams.guests}, habitaciones: ${searchParams.rooms}`,
    "",
    "Resultados disponibles (única fuente de información permitida):",
    resultsBlock,
    "",
    "Recomienda la mejor opción de esta lista para este viaje, explicando brevemente por qué.",
  ].join("\n");

  return { system: RECOMMENDATION_SYSTEM_INSTRUCTIONS, user };
}
