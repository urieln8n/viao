// F9-03 (VIAO_ROADMAP.md) — Tests de rate limiting contra Supabase local
// real (no un mock) — `checkAndConsumeRateLimit` solo usa
// `createServiceRoleClient()` (sin `next/headers`), así que es
// completamente ejercitable aquí, mismo patrón que
// lib/rewards/create-reward-transaction.test.ts (F7-01).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { checkAndConsumeRateLimit } from "./check-rate-limit";
import {
  AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL,
  VISION_SCAN_RATE_LIMIT_PROVISIONAL,
} from "./config";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f903-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f903-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

const ENDPOINT = "ai_recommendation_test";

test(`checkAndConsumeRateLimit: permite hasta ${AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests} llamadas y bloquea la siguiente`, async () => {
  const { userId } = await signUpUser();
  try {
    for (let i = 0; i < AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests; i++) {
      const result = await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
      assert.equal(result.allowed, true, `la llamada ${i + 1} debía estar permitida`);
    }

    const blocked = await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(blocked.allowed, false, "la llamada límite+1 debía estar bloqueada");
    assert.equal(blocked.limit, AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests);
  } finally {
    await deleteTestUser(userId);
  }
});

test("checkAndConsumeRateLimit: una llamada bloqueada NO inserta una fila nueva (no genera consumo)", async () => {
  const { userId } = await signUpUser();
  try {
    for (let i = 0; i < AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests; i++) {
      await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    }
    await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    await checkAndConsumeRateLimit({ userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });

    const service = createServiceRoleClient();
    const { count } = await service
      .from("ai_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", ENDPOINT);

    assert.equal(
      count,
      AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests,
      "el número de filas nunca debe superar el límite, aunque se intenten más llamadas",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("checkAndConsumeRateLimit: dos usuarios distintos tienen presupuestos independientes", async () => {
  const userA = await signUpUser();
  const userB = await signUpUser();
  try {
    for (let i = 0; i < AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests; i++) {
      const result = await checkAndConsumeRateLimit({ userId: userA.userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
      assert.equal(result.allowed, true);
    }
    const blockedA = await checkAndConsumeRateLimit({ userId: userA.userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(blockedA.allowed, false, "usuario A debe estar bloqueado tras agotar su cupo");

    const firstB = await checkAndConsumeRateLimit({ userId: userB.userId, endpoint: ENDPOINT, rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(firstB.allowed, true, "usuario B no debe verse afectado por el consumo de A");
  } finally {
    await deleteTestUser(userA.userId);
    await deleteTestUser(userB.userId);
  }
});

test("checkAndConsumeRateLimit: distintos endpoints no comparten presupuesto", async () => {
  const { userId } = await signUpUser();
  try {
    for (let i = 0; i < AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests; i++) {
      await checkAndConsumeRateLimit({ userId, endpoint: "endpoint_a", rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    }
    const blockedA = await checkAndConsumeRateLimit({ userId, endpoint: "endpoint_a", rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(blockedA.allowed, false);

    const firstB = await checkAndConsumeRateLimit({ userId, endpoint: "endpoint_b", rule: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL });
    assert.equal(firstB.allowed, true, "un endpoint distinto no debe compartir el contador");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS Patrón B: ningún acceso de cliente, ni siquiera lectura ──
test("un cliente autenticado no puede leer ai_rate_limit_events directamente (sin GRANT/policy)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient.from("ai_rate_limit_events").select("id").limit(1);
    assert.ok(error, "se esperaba que RLS/GRANT rechazara el select desde el cliente autenticado");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un cliente autenticado no puede insertar en ai_rate_limit_events directamente (sin GRANT/policy)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient
      .from("ai_rate_limit_events")
      .insert({ user_id: userId, endpoint: ENDPOINT });
    assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente autenticado");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un cliente anon no puede leer ni insertar en ai_rate_limit_events", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error: selectError } = await anonClient
    .from("ai_rate_limit_events")
    .select("id")
    .limit(1);
  assert.ok(selectError, "se esperaba que el select anon fuera rechazado");

  const { error: insertError } = await anonClient
    .from("ai_rate_limit_events")
    .insert({ user_id: "00000000-0000-0000-0000-000000000000", endpoint: ENDPOINT });
  assert.ok(insertError, "se esperaba que el insert anon fuera rechazado");
});

// ── F10-05: cada endpoint usa su PROPIA rule, no la de otro (presupuesto independiente con límites distintos) ──
test("checkAndConsumeRateLimit: AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL y VISION_SCAN_RATE_LIMIT_PROVISIONAL son valores provisionales distintos", () => {
  assert.notEqual(
    AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL.maxRequests,
    VISION_SCAN_RATE_LIMIT_PROVISIONAL.maxRequests,
    "si algún día coincidieran por casualidad, este test deja de ser útil como evidencia — deben configurarse por separado",
  );
});

test("checkAndConsumeRateLimit: la rule pasada, no el endpoint, determina el límite aplicado (bloquea justo en VISION_SCAN_RATE_LIMIT_PROVISIONAL.maxRequests, no en el de recomendación)", async () => {
  const { userId } = await signUpUser();
  try {
    for (let i = 0; i < VISION_SCAN_RATE_LIMIT_PROVISIONAL.maxRequests; i++) {
      const result = await checkAndConsumeRateLimit({
        userId,
        endpoint: "vision_scan_test",
        rule: VISION_SCAN_RATE_LIMIT_PROVISIONAL,
      });
      assert.equal(result.allowed, true, `la llamada ${i + 1} debía estar permitida bajo el límite de Vision`);
    }

    const blocked = await checkAndConsumeRateLimit({
      userId,
      endpoint: "vision_scan_test",
      rule: VISION_SCAN_RATE_LIMIT_PROVISIONAL,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.limit, VISION_SCAN_RATE_LIMIT_PROVISIONAL.maxRequests);
  } finally {
    await deleteTestUser(userId);
  }
});
