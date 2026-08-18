// F12-05 (VIAO_ROADMAP.md) — Tests de `recordReturnVisitIfApplicable()`
// contra Supabase local real. Cubre explícitamente los casos J/K/L del
// checklist obligatorio de F12: segunda sesión -> return_visit; primera
// visita/registro -> NO return_visit; repetir carga/render de la misma
// sesión -> no duplicar.
//
// El "primer uso registrado" es el evento más antiguo de `analytics_events`
// para el usuario — para simular "un segundo día" sin esperar 24h reales,
// se inserta directamente (vía `service_role`, que ya tiene INSERT sobre
// `analytics_events` desde F5-05 — sin necesitar ningún GRANT nuevo) un
// evento con `created_at` en el pasado, anterior al `registered` real que
// ya creó el trigger en el signUp.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { recordReturnVisitIfApplicable } from "./record-return-visit";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1205-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1205-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function simulatePastFirstUse(userId: string, daysAgo: number) {
  const service = createServiceRoleClient();
  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - daysAgo);
  const { error } = await service.from("analytics_events").insert({
    event_name: "registered",
    user_id: userId,
    created_at: pastDate.toISOString(),
  });
  assert.equal(error, null, `no se pudo insertar el evento retrasado: ${error?.message}`);
}

test("Caso K: primera visita/registro (mismo día, sin ningún evento anterior) -> NO genera return_visit", async () => {
  const { userId } = await signUpUser();
  try {
    const result = await recordReturnVisitIfApplicable(userId);
    assert.equal(result.recorded, false);

    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "return_visit");
    assert.equal(data?.length ?? 0, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

test("Caso J: segunda sesión (día posterior al registro) -> SÍ genera return_visit", async () => {
  const { userId } = await signUpUser();
  try {
    await simulatePastFirstUse(userId, 1);

    const result = await recordReturnVisitIfApplicable(userId);
    assert.equal(result.recorded, true);

    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("id, user_id, event_name")
      .eq("user_id", userId)
      .eq("event_name", "return_visit");
    assert.equal(data?.length, 1);
  } finally {
    await deleteTestUser(userId);
  }
});

test("Caso L: repetir la llamada el mismo día no genera un segundo return_visit (deduplicación)", async () => {
  const { userId } = await signUpUser();
  try {
    await simulatePastFirstUse(userId, 2);

    const first = await recordReturnVisitIfApplicable(userId);
    const second = await recordReturnVisitIfApplicable(userId);
    const third = await recordReturnVisitIfApplicable(userId);

    assert.equal(first.recorded, true);
    assert.equal(second.recorded, false);
    assert.equal(third.recorded, false);

    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "return_visit");
    assert.equal(data?.length, 1, "repetir la carga/render de la misma sesión no debe duplicar el evento");
  } finally {
    await deleteTestUser(userId);
  }
});

test("recordReturnVisitIfApplicable: usuario inexistente -> recorded:false, no lanza", async () => {
  const result = await recordReturnVisitIfApplicable("11111111-2222-3333-4444-555555555555");
  assert.equal(result.recorded, false);
});
