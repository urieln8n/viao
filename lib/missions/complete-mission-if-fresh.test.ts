// P14.4-F (F3 — Points Feedback) — tests de `completeMissionIfFresh()`
// contra Supabase real. Cubre los escenarios de feedback pedidos por el
// encargo (sección "TESTS OBLIGATORIOS — Feedback", puntos 12/13:
// "Mission genera feedback" / "No se muestra feedback duplicado") a
// nivel de la lógica que decide el dato mostrado en el toast — la propia
// renderización del toast (DOM) no es testeable en este proyecto
// (`node:test` plano, sin jsdom/testing-library instalados,
// confirmado antes de escribir esto), documentado explícitamente en el
// informe de este bloque.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { completeMissionIfFresh } from "./complete-mission-if-fresh";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `p144f-fresh-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "p144f-fresh-pw-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

// ── Test 12 — Mission genera feedback (dato correcto la primera vez) ──
test("completeMissionIfFresh: la primera completion real de una Mission devuelve los Points otorgados (Test 12)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const pointsEarned = await completeMissionIfFresh(sessionClient, userId, "goal_created", "lifetime");
    assert.equal(pointsEarned, 50, "goal_created otorga 50 Points (lib/missions/rules.ts) — debe reflejarse tal cual la primera vez");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Test 13 — No se muestra feedback duplicado ──
test("completeMissionIfFresh: una segunda llamada para la MISMA Mission/periodo devuelve undefined — nunca vuelve a afirmar Points ganados (Test 13)", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const first = await completeMissionIfFresh(sessionClient, userId, "goal_created", "lifetime");
    assert.equal(first, 50);

    const second = await completeMissionIfFresh(sessionClient, userId, "goal_created", "lifetime");
    assert.equal(second, undefined, "Test 13: la Mission ya estaba completada — el feedback no debe repetirse");

    const third = await completeMissionIfFresh(sessionClient, userId, "goal_created", "lifetime");
    assert.equal(third, undefined, "una tercera llamada tampoco debe volver a afirmar Points ganados");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Mission inexistente / periodo semanal — comportamiento no roto ──
test("completeMissionIfFresh: una mission_key inexistente devuelve undefined, sin lanzar", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const result = await completeMissionIfFresh(sessionClient, userId, "mission_que_no_existe", "lifetime");
    assert.equal(result, undefined);
  } finally {
    await deleteTestUser(userId);
  }
});
