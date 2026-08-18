// F10-00 (VIAO_ROADMAP.md) — Tests de consentimiento contra Supabase
// local real (no un mock). Mismo motivo que F5-06/F6-01 para no depender
// de `next/headers` en `hasActiveVisionConsent()` en sí (usa
// `createSessionClient()`): solo se ejercita aquí directamente el camino
// "fuera de una petición real de Next.js" — la lógica de RLS/estado real
// se prueba con clientes `@supabase/supabase-js` reales (anon + usuarios
// vía signUp), exactamente igual que create-search-record.test.ts (F5-06).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { hasActiveVisionConsent } from "./check-vision-consent";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1000-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1000-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

// ── Resiliencia fuera de una petición real de Next.js (fail-closed: sin sesión -> sin consentimiento) ──
test("hasActiveVisionConsent(): fuera de una petición real de Next.js devuelve false, no lanza", async () => {
  const result = await hasActiveVisionConsent();
  assert.equal(result, false);
});

// ── RLS: sin ninguna fila -> sin consentimiento ──
test("un usuario sin ninguna fila en vision_consents no tiene consentimiento activo", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data, error } = await authedClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.equal(error, null);
    assert.equal(data, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: conceder -> el propio usuario ve su consentimiento activo ──
test("un usuario autenticado puede conceder su propio consentimiento (Patrón A, WITH CHECK user_id = auth.uid())", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error: insertError } = await authedClient
      .from("vision_consents")
      .insert({ user_id: userId, action: "granted" });
    assert.equal(insertError, null, `insert falló: ${insertError?.message}`);

    const { data, error } = await authedClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.action, "granted");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: retirar -> la fila más reciente decide el estado ──
test("tras retirar el consentimiento, la fila más reciente (withdrawn) determina el estado", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    await authedClient.from("vision_consents").insert({ user_id: userId, action: "granted" });
    await authedClient.from("vision_consents").insert({ user_id: userId, action: "withdrawn" });

    const { data } = await authedClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.ok(data);
    assert.equal(data.action, "withdrawn");
  } finally {
    await deleteTestUser(userId);
  }
});

test("re-conceder tras retirar vuelve a activar el consentimiento (historial completo conservado)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    await authedClient.from("vision_consents").insert({ user_id: userId, action: "granted" });
    await authedClient.from("vision_consents").insert({ user_id: userId, action: "withdrawn" });
    await authedClient.from("vision_consents").insert({ user_id: userId, action: "granted" });

    const { data: history } = await authedClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: true });
    assert.equal(history?.length, 3, "las 3 filas del historial deben conservarse");

    const { data: latest } = await authedClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.equal(latest?.action, "granted");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: un usuario NO puede leer/insertar el consentimiento de otro ──
test("un usuario autenticado NO puede leer el consentimiento de otro usuario (RLS lo filtra)", async () => {
  const owner = await signUpUser();
  const other = await signUpUser();
  try {
    await owner.authedClient.from("vision_consents").insert({ user_id: owner.userId, action: "granted" });

    const { data, error } = await other.authedClient
      .from("vision_consents")
      .select("action")
      .eq("user_id", owner.userId);
    assert.equal(error, null);
    assert.equal(data!.length, 0, "un usuario ajeno no debe ver el consentimiento de otro");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});

test("un usuario autenticado NO puede insertar un consentimiento con un user_id ajeno (WITH CHECK lo impide)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const foreignUserId = "11111111-1111-1111-1111-111111111111";
    const { error } = await authedClient
      .from("vision_consents")
      .insert({ user_id: foreignUserId, action: "granted" });
    assert.ok(error, "se esperaba que WITH CHECK rechazara un user_id distinto al propio");
  } finally {
    await deleteTestUser(userId);
  }
});

test("la constraint CHECK de action rechaza un valor fuera de granted/withdrawn", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient
      .from("vision_consents")
      .insert({ user_id: userId, action: "maybe" });
    assert.ok(error, "se esperaba que la constraint CHECK rechazara un action inválido");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: anon no puede leer ni insertar ──
test("un cliente anon no puede leer ni insertar en vision_consents", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error: selectError } = await anonClient.from("vision_consents").select("id").limit(1);
  assert.ok(selectError, "se esperaba que el select anon fuera rechazado");

  const { error: insertError } = await anonClient
    .from("vision_consents")
    .insert({ user_id: "00000000-0000-0000-0000-000000000000", action: "granted" });
  assert.ok(insertError, "se esperaba que el insert anon fuera rechazado");
});

// ── Sin UPDATE/DELETE para nadie (log inmutable) ──
test("un usuario autenticado no puede hacer UPDATE ni DELETE en vision_consents (log inmutable)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: inserted } = await authedClient
      .from("vision_consents")
      .insert({ user_id: userId, action: "granted" })
      .select()
      .single();
    assert.ok(inserted);

    const { error: updateError } = await authedClient
      .from("vision_consents")
      .update({ action: "withdrawn" })
      .eq("id", inserted.id);
    assert.ok(updateError, "se esperaba que el UPDATE fuera rechazado (sin GRANT/policy)");

    const { error: deleteError } = await authedClient
      .from("vision_consents")
      .delete()
      .eq("id", inserted.id);
    assert.ok(deleteError, "se esperaba que el DELETE fuera rechazado (sin GRANT/policy)");
  } finally {
    await deleteTestUser(userId);
  }
});
