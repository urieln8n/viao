import { createServiceRoleClient } from "../supabase/service";
import { AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL } from "./config";

// F9-03 (VIAO_ROADMAP.md) — Rate limiting por usuario, persistente
// (`ai_rate_limit_events`, supabase/migrations/20260818160000_*.sql —
// justificación completa de por qué NO es en memoria en esa migración).
//
// Contador por ventana deslizante: cuenta filas de este usuario+endpoint
// con `created_at >= ahora - windowMs`. Si el conteo ya alcanzó el
// límite, se rechaza SIN insertar ninguna fila nueva (una llamada
// bloqueada no "consume" cupo — si no se bloqueara así, el propio
// bloqueo iría empujando la ventana indefinidamente). Si se permite, se
// inserta una fila que cuenta para futuras comprobaciones.
//
// Debe llamarse ANTES de invocar el wrapper de OpenAI
// (app/search/ai-recommendation/actions.ts, F9-02) — este módulo no sabe
// nada de OpenAI, solo de contar intentos.
//
// Límite conocido, documentado (no oculto): comprobar-y-luego-insertar no
// es atómico, así que una carrera real con varias solicitudes
// concurrentes del MISMO usuario en el mismo instante podría, en el peor
// caso, permitir alguna solicitud de más dentro de esa ventana de
// carrera. Para un límite de coste de un MVP (no un control de seguridad
// dura) esto es un riesgo aceptado y deliberado — introducir una función
// SQL `SECURITY DEFINER` solo para hacerlo atómico sería la
// infraestructura dedicada que la sección 24 de la arquitectura pide
// explícitamente evitar "solo para esto".
export interface CheckAndConsumeRateLimitInput {
  userId: string;
  endpoint: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
}

export async function checkAndConsumeRateLimit({
  userId,
  endpoint,
}: CheckAndConsumeRateLimitInput): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL;
  const service = createServiceRoleClient();
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await service
    .from("ai_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`No se pudo comprobar el rate limit: ${error.message}`);
  }

  if ((count ?? 0) >= maxRequests) {
    return { allowed: false, limit: maxRequests };
  }

  const { error: insertError } = await service
    .from("ai_rate_limit_events")
    .insert({ user_id: userId, endpoint });

  if (insertError) {
    throw new Error(
      `No se pudo registrar el intento de rate limit: ${insertError.message}`,
    );
  }

  return { allowed: true, limit: maxRequests };
}
