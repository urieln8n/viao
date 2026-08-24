// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Tests de getRewardsCatalog() y RLS de rewards_catalog.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

function anonClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

async function signUpUser() {
  const client = anonClient();
  const email = `bloque1-catalog-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "bloque1-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

// ── 1. Catálogo accesible para usuario autenticado ──
test("rewards_catalog: un usuario autenticado puede leer un Reward activo real", async () => {
  const service = createServiceRoleClient();
  const title = `Bloque 1 RLS test ${Date.now()}`;
  const { data: created, error: createError } = await service
    .from("rewards_catalog")
    .insert({ title, points_cost: 100, funding_type: "partner", active: true })
    .select("id")
    .single();
  assert.equal(createError, null, createError?.message);

  const { userId, sessionClient } = await signUpUser();
  try {
    const { data, error } = await sessionClient
      .from("rewards_catalog")
      .select("id, title")
      .eq("id", created!.id as string)
      .maybeSingle();

    assert.equal(error, null, error?.message);
    assert.ok(data, "el cliente de sesión debe poder leer el catálogo");
    assert.equal(data!.title, title);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 2. Catálogo no modificable por cliente ──
test("rewards_catalog: el cliente de sesión no puede insertar ni modificar Rewards", async () => {
  const { userId, sessionClient } = await signUpUser();
  try {
    const { error: insertError } = await sessionClient
      .from("rewards_catalog")
      .insert({ title: "Reward inventado por el cliente", points_cost: 1, funding_type: "partner" });
    assert.ok(insertError, "el INSERT desde el cliente debe fallar (sin GRANT de insert para authenticated)");

    const service = createServiceRoleClient();
    const { data: real } = await service
      .from("rewards_catalog")
      .insert({ title: `Bloque 1 RLS update test ${Date.now()}`, points_cost: 50, funding_type: "partner" })
      .select("id")
      .single();

    const { error: updateError } = await sessionClient
      .from("rewards_catalog")
      .update({ points_cost: 1 })
      .eq("id", real!.id as string);
    assert.ok(updateError, "el UPDATE desde el cliente debe fallar (sin GRANT de update para authenticated)");
  } finally {
    await deleteTestUser(userId);
  }
});
