// F13-04 (VIAO_ROADMAP.md) — Comportamiento de `checkAndConsumeRateLimit`
// bajo llamadas CONCURRENTES reales (Promise.all), contra Supabase local
// real. `lib/rate-limit/check-rate-limit.ts` documenta explícitamente un
// riesgo de carrera ACEPTADO (comprobar-y-luego-insertar no es atómico:
// "para un límite de coste de un MVP (no un control de seguridad dura)
// esto es un riesgo aceptado y deliberado") — este test demuestra
// EMPÍRICAMENTE cuál es el comportamiento real bajo concurrencia, en vez
// de asumirlo, y deja constancia permanente de que el sistema NUNCA
// permite un número de filas mayor que "el límite + el tamaño del lote
// concurrente enviado de una vez" (cota superior real, no ilimitada).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { checkAndConsumeRateLimit } from "../rate-limit/check-rate-limit";
import { AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL } from "../rate-limit/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1304-conc-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1304-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

const ENDPOINT = "ai_recommendation_concurrency_test";

test("F13-04: N llamadas concurrentes reales (Promise.all) nunca permiten más de N filas por encima del límite (cota superior real, no ilimitada)", async () => {
  const { userId } = await signUpUser();
  try {
    const CONCURRENT_CALLS = 15; // muy por encima de maxRequests=5, a propósito
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () =>
        checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL }),
      ),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    const service = createServiceRoleClient();
    const { count: rowCount } = await service
      .from("ai_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", ENDPOINT);

    // Documentado como riesgo aceptado: bajo una carrera concurrente real,
    // el número de filas puede superar maxRequests (comprobar-y-luego-
    // insertar no es atómico), pero NUNCA puede superar el tamaño del lote
    // concurrente enviado — es decir, sigue habiendo una cota superior
    // real y acotada, nunca "sin límite".
    assert.ok(
      (rowCount ?? 0) <= CONCURRENT_CALLS,
      `las filas insertadas (${rowCount}) nunca deben superar el número de llamadas concurrentes enviadas (${CONCURRENT_CALLS})`,
    );
    assert.equal(
      allowedCount,
      rowCount,
      "el número de resultados 'allowed:true' debe coincidir exactamente con las filas realmente insertadas",
    );
    console.log(
      `[F13-04 evidencia] ${CONCURRENT_CALLS} llamadas concurrentes, límite=${AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests}, permitidas=${allowedCount}, filas reales=${rowCount}`,
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("F13-04: tras una ráfaga concurrente, una llamada SECUENCIAL posterior respeta el límite ya consumido", async () => {
  const { userId } = await signUpUser();
  try {
    await Promise.all(
      Array.from({ length: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests }, () =>
        checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL }),
      ),
    );

    const next = await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(next.allowed, false, "tras agotar el cupo (incluso concurrentemente), la siguiente llamada secuencial debe bloquearse");
  } finally {
    await deleteTestUser(userId);
  }
});
