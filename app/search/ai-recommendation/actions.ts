"use server";

import { createClient as createSessionClient } from "../../../lib/supabase/server";
import { getSearchById } from "../../../lib/searches/get-search-by-id";
import { getTravelProvider } from "../../../lib/travel-provider";
import { TravelProviderError } from "../../../lib/travel-provider/errors";
import { checkAndConsumeRateLimit } from "../../../lib/rate-limit/check-rate-limit";
import { AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL } from "../../../lib/rate-limit/config";
import {
  generateSearchRecommendation,
  type RecommendationContextItem,
} from "../../../lib/openai";
import { isAiRecommendationsEnabled } from "../../../lib/openai/config";
import { logAiRecommendationOutcome } from "../../../lib/openai/log";
import { isValidUuid } from "../../properties/[id]/resolve";

// F9-02 (VIAO_ROADMAP.md) — Server Action de recomendación IA.
//
// El cliente puede enviar como máximo un `searchId` (string) — nada más.
// Ningún precio/nombre/rating/disponibilidad enviado por el cliente se
// usa jamás como contexto: todo el contexto que llega a OpenAI se
// reconstruye aquí, server-side, a partir de datos reales.
//
// Orden de comprobaciones (ninguna se salta, cada una corta el flujo si
// falla):
// 1. Formato de `searchId` (mismo `isValidUuid` que F5-04/F6-01, sin
//    duplicar el regex).
// 2. Autenticación — mismo patrón fail-closed de F6/F7/F8: cualquier
//    fallo al resolver la sesión se trata como "no autenticado", nunca
//    como autenticado por defecto.
// 3. Kill switch (F9-05) — se comprueba aquí TAMBIÉN (no solo dentro del
//    wrapper de F9-01), inmediatamente después de autenticar y ANTES de
//    consumir cupo de rate limit o tocar el TravelProvider. Hallazgo de
//    la revisión final: comprobarlo solo dentro del wrapper significaba
//    que, con la IA deshabilitada, una solicitud igualmente consumía una
//    de las 5 llamadas/hora del usuario (verificado empíricamente contra
//    Supabase local) antes de ser rechazada sin coste — sin ser un
//    agujero de seguridad (nunca se generaba coste), sí era un efecto
//    secundario evitable: un usuario podía agotar su cupo real mientras
//    la IA estaba apagada por decisión de operación, y encontrarse
//    `rate_limited` en cuanto se reactivara. El wrapper conserva su
//    propia comprobación (`lib/openai/index.ts`) como defensa en
//    profundidad para cualquier otro futuro llamador directo — la fuente
//    de verdad sigue siendo la única, `isAiRecommendationsEnabled()`
//    (`lib/openai/config.ts`); esto solo adelanta la misma comprobación.
// 4. Ownership + existencia: `getSearchById()` (F6-01) usa el cliente de
//    sesión, protegido por `searches_select_own` (RLS Patrón A) —
//    devuelve `undefined` tanto si el `searchId` no existe como si
//    pertenece a otro usuario; ambos casos son indistinguibles a
//    propósito (no se filtra si un id "existe pero no es tuyo").
// 5. Rate limit (F9-03) — se comprueba aquí, DESPUÉS de confirmar que la
//    solicitud es legítima (propia) pero ANTES de tocar el
//    TravelProvider o el wrapper de OpenAI, para no gastar cupo de un
//    usuario en un `searchId` ajeno/inválido, y para que ninguna llamada
//    bloqueada llegue nunca a generar coste.
// 6. Resultados reales: NO existe ninguna tabla que persista los
//    resultados de una búsqueda (`searches` solo guarda
//    `results_count`, VIAO_DATABASE.md sección 5) — se reconstruyen
//    re-consultando `getTravelProvider()` con los mismos parámetros ya
//    validados de la búsqueda real, exactamente el mismo patrón ya
//    establecido por `resolveBookingContext` (F6-01,
//    app/booking/[propertyId]/resolve.ts) para el mismo problema. No es
//    una tabla/relación inventada: es la misma fuente de verdad
//    (`TravelProvider`) que ya produjo los resultados originales.
// 7. `generateSearchRecommendation()` (F9-01) — único punto de llamada al
//    wrapper de OpenAI.
//
// Trazabilidad (F9-02: "debe poder saberse qué propiedades/resultados
// fueron utilizados como contexto"): la respuesta de éxito incluye
// `usedPropertyIds`.
export type AiRecommendationActionResult =
  | { status: "success"; recommendation: string; usedPropertyIds: string[] }
  | { status: "unauthenticated" }
  | { status: "invalid_search_id" }
  | { status: "search_not_found" }
  | { status: "rate_limited"; limit: number }
  | { status: "ai_disabled" }
  | { status: "provider_error"; message: string };

const ENDPOINT = "ai_recommendation";

export async function requestAiRecommendationAction(
  rawSearchId: unknown,
): Promise<AiRecommendationActionResult> {
  if (typeof rawSearchId !== "string" || !isValidUuid(rawSearchId)) {
    return { status: "invalid_search_id" };
  }
  const searchId = rawSearchId;

  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return { status: "unauthenticated" };
  }

  if (!isAiRecommendationsEnabled()) {
    await logAiRecommendationOutcome({
      endpoint: ENDPOINT,
      searchId,
      outcome: "disabled",
    });
    return { status: "ai_disabled" };
  }

  const search = await getSearchById(searchId);
  if (!search) {
    return { status: "search_not_found" };
  }

  const rateLimit = await checkAndConsumeRateLimit({
    userId,
    endpoint: ENDPOINT,
    rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL,
  });
  if (!rateLimit.allowed) {
    await logAiRecommendationOutcome({
      endpoint: ENDPOINT,
      searchId,
      outcome: "rate_limited",
    });
    return { status: "rate_limited", limit: rateLimit.limit };
  }

  const provider = getTravelProvider();
  let results: RecommendationContextItem[];
  try {
    const properties = await provider.search({
      destination: search.destination,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: search.guests,
      rooms: search.rooms,
    });

    results = await Promise.all(
      properties.map(async (property): Promise<RecommendationContextItem> => {
        const base: RecommendationContextItem = {
          providerPropertyId: property.providerPropertyId,
          name: property.name,
          city: property.city,
          country: property.country,
          rating: property.rating,
        };
        try {
          const price = await provider.getPrice({
            providerPropertyId: property.providerPropertyId,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            guests: search.guests,
            rooms: search.rooms,
          });
          return { ...base, price };
        } catch {
          return base;
        }
      }),
    );
  } catch (error) {
    if (error instanceof TravelProviderError) {
      return { status: "provider_error", message: error.message };
    }
    throw error;
  }

  const wrapperResult = await generateSearchRecommendation({
    searchId,
    searchParams: {
      destination: search.destination,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: search.guests,
      rooms: search.rooms,
    },
    results,
  });

  if (wrapperResult.status === "disabled") {
    return { status: "ai_disabled" };
  }
  if (wrapperResult.status === "provider_error") {
    return { status: "provider_error", message: wrapperResult.message };
  }
  return {
    status: "success",
    recommendation: wrapperResult.recommendation,
    usedPropertyIds: results.map((result) => result.providerPropertyId),
  };
}
