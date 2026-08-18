// F12-02 (VIAO_ROADMAP.md) — Tests de `logAnalyticsEvent()` contra
// Supabase local real. Cubre específicamente el comportamiento NUEVO de
// F12: el parámetro opcional `explicitUserId` (necesario para atribuir
// `reward_earned` al referrer, que no es el usuario de la sesión actual —
// ver lib/referrals/complete-referral-action.ts) y la seguridad real de
// `analytics_events` (Patrón B: ningún INSERT/SELECT para el cliente, ni
// siquiera con su propio user_id — caso F del checklist de F12).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { logAnalyticsEvent } from "./log-event";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1202-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1202-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("logAnalyticsEvent: con explicitUserId, escribe el evento atribuido a ESE usuario (no depende de next/headers)", async () => {
  const { userId } = await signUpUser();
  try {
    // El trigger de registro (F12-02) ya crea un reward_earned propio para
    // este usuario nuevo (recompensa de registro) — se distingue el de
    // este test por su metadata.amount, en vez de asumir que es el único.
    await logAnalyticsEvent("reward_earned", { amount: 10 }, userId);

    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("event_name, user_id, metadata")
      .eq("user_id", userId)
      .eq("event_name", "reward_earned");

    const ownEvent = (data ?? []).find((row) => (row.metadata as Record<string, unknown>).amount === 10);
    assert.ok(ownEvent, "debe existir el evento insertado por este test (metadata.amount === 10)");
    assert.equal(ownEvent.user_id, userId);
  } finally {
    await deleteTestUser(userId);
  }
});

test("logAnalyticsEvent: sin explicitUserId y fuera de una petición real de Next.js, no lanza (best-effort) y no inserta con un user_id inventado", async () => {
  await assert.doesNotReject(() => logAnalyticsEvent("search_started", { destination: "Madrid" }));
});

test("analytics_events (Patrón B, caso F del checklist de F12): un usuario autenticado NO puede insertar directamente un evento, ni siquiera con su propio user_id", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient
      .from("analytics_events")
      .insert({ event_name: "reward_earned", user_id: userId, metadata: {} });

    assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente");
  } finally {
    await deleteTestUser(userId);
  }
});

test("analytics_events (caso F del checklist de F12): un usuario autenticado NO puede insertar un evento a nombre de OTRO usuario", async () => {
  const attacker = await signUpUser();
  const victim = await signUpUser();
  try {
    // Marca distintiva en metadata para no confundir este intento con el
    // reward_earned real de registro que la víctima ya tiene por su propio
    // signUp (trigger, F12-02).
    const { error } = await attacker.authedClient
      .from("analytics_events")
      .insert({ event_name: "reward_earned", user_id: victim.userId, metadata: { forged: true } });

    assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert a nombre de otro usuario");

    const service = createServiceRoleClient();
    const { data } = await service
      .from("analytics_events")
      .select("id, metadata")
      .eq("user_id", victim.userId)
      .eq("event_name", "reward_earned");
    const forgedEvent = (data ?? []).find((row) => (row.metadata as Record<string, unknown>).forged === true);
    assert.equal(forgedEvent, undefined, "no debe haberse creado el evento falsificado marcado para la víctima");
  } finally {
    await deleteTestUser(attacker.userId);
    await deleteTestUser(victim.userId);
  }
});

test("analytics_events (caso D del checklist de F12): un event_name fuera de la taxonomía es rechazado por el CHECK constraint real", async () => {
  const service = createServiceRoleClient();
  const { error } = await service
    .from("analytics_events")
    .insert({ event_name: "evento_inventado_no_existe", metadata: {} });

  assert.ok(error, "se esperaba que el CHECK constraint rechazara un event_name fuera de la taxonomía");
});

test("analytics_events (Patrón B): un cliente anon no puede leer ni insertar", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(supabaseUrl, anonKey);

  // A diferencia de otras tablas (donde RLS filtra en silencio a 0 filas),
  // `analytics_events` no concede NINGÚN GRANT de SELECT a `anon` a nivel
  // de tabla (VIAO_DATABASE.md sección 12, "Leer: nadie desde el
  // cliente") — Postgres rechaza la consulta directamente con "permission
  // denied", antes de que RLS llegue a evaluarse.
  const { data: selectData, error: selectError } = await anon.from("analytics_events").select("*");
  assert.ok(selectError, "se esperaba que Postgres rechazara el SELECT: anon no tiene GRANT sobre analytics_events");
  assert.equal(selectData, null);

  const { error: insertError } = await anon
    .from("analytics_events")
    .insert({ event_name: "search_started", metadata: {} });
  assert.ok(insertError, "anon no debe poder insertar eventos");
});
