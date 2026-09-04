// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Tests de getRewardsCatalog() y RLS de rewards_catalog.
// P14.4-E — extendido con tests de schema para `rewards_catalog.partner_id`
// (Decision Lock OPCIÓN C), ver bloque de tests "P0-2" más abajo.

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

// rewards_catalog no concede DELETE a ningún rol (ni siquiera service_role
// — mismo criterio "nunca borrar" ya aplicado al resto de tablas tipo
// ledger/catálogo del proyecto): la única forma de retirar una fila de
// prueba es la misma que usaría el producto real para retirar un Reward,
// `active=false` (ya filtrado por getRewardsCatalog() y por
// redeem_reward()). Evita que cada ejecución de la suite deje basura
// permanente y creciente en el catálogo real.
async function deactivateTestReward(rewardId: string) {
  const service = createServiceRoleClient();
  await service.from("rewards_catalog").update({ active: false }).eq("id", rewardId);
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
    await deactivateTestReward(created!.id as string);
  }
});

// ── 2. Catálogo no modificable por cliente ──
test("rewards_catalog: el cliente de sesión no puede insertar ni modificar Rewards", async () => {
  const { userId, sessionClient } = await signUpUser();
  let realRewardId: string | undefined;
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
    realRewardId = real!.id as string;

    const { error: updateError } = await sessionClient
      .from("rewards_catalog")
      .update({ points_cost: 1 })
      .eq("id", real!.id as string);
    assert.ok(updateError, "el UPDATE desde el cliente debe fallar (sin GRANT de update para authenticated)");
  } finally {
    await deleteTestUser(userId);
    if (realRewardId) await deactivateTestReward(realRewardId);
  }
});

// ── P14.4-E (Decision Lock OPCIÓN C, migración
// 20260904100000_add_partner_id_to_rewards_catalog.sql) — tests de
// schema/modelo para `rewards_catalog.partner_id`. Ninguno construye ni
// prueba UI (no existe todavía, fuera de alcance de este bloque, ver
// VIAO_P14_4_E_P0_IMPLEMENTATION.md §19) — solo el dato y su FK. Mismo
// patrón "nunca borrar" ya usado en este archivo (`active=false`) y en
// `partners` (sin GRANT de DELETE, `20260825120000_create_partners.sql`)
// — los Partners de prueba se crean con `is_test: true` (excluidos de
// Discovery/Admin por diseño, `20260830160000_add_partners_is_test_flag.sql`),
// nunca se borran.
async function createTestPartner(): Promise<string> {
  const service = createServiceRoleClient();
  const slug = `p1440e-test-partner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: "P14.4-E test partner", slug, category: "service", is_test: true })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

// ── 3. partner_id nullable — una fila existente/nueva sin Partner sigue siendo válida ──
// P14.4-E VALIDATION (corrección post-ejecución real) — `points_cost: 10,
// real_cost_eur: 1` violaba `rewards_catalog_viao_real_cost_within_30_percent`
// (`real_cost_eur <= 0.30 * points_cost/100`; CHECK preexistente, no
// introducido por P0-2, no debilitado aquí): con `points_cost=10` el
// tope es 0.03€, muy por debajo de 1€. `points_cost: 1000` sube el tope
// a 3.00€ (`0.30 * 1000/100`), dejando `real_cost_eur: 1` cómodamente
// dentro — mismo `funding_type='viao'`, mismo propósito exacto del test
// (un Reward sin Partner asociado, `partner_id` nunca establecido, debe
// insertarse y leerse con `partner_id=NULL`), ninguna otra intención
// cambiada.
test("rewards_catalog.partner_id: nullable — un Reward sin Partner asociado se inserta y lee sin error (Test P0-2.1)", async () => {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({ title: `P14.4-E sin partner ${Date.now()}`, points_cost: 1000, funding_type: "viao", real_cost_eur: 1 })
    .select("id, partner_id")
    .single();

  try {
    assert.equal(error, null, error?.message);
    assert.equal(data!.partner_id, null, "un Reward funding_type='viao' debe seguir teniendo partner_id=NULL, nunca forzado");
  } finally {
    if (data) await deactivateTestReward(data.id as string);
  }
});

// ── 4. Un Partner válido puede asociarse ──
test("rewards_catalog.partner_id: un Partner válido y activo puede asociarse a un Reward (Test P0-2.2)", async () => {
  const service = createServiceRoleClient();
  const partnerId = await createTestPartner();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({ title: `P14.4-E con partner ${Date.now()}`, points_cost: 20, funding_type: "partner", partner_id: partnerId })
    .select("id, partner_id")
    .single();

  try {
    assert.equal(error, null, error?.message);
    assert.equal(data!.partner_id, partnerId, "el partner_id insertado debe leerse de vuelta exactamente igual");
  } finally {
    if (data) await deactivateTestReward(data.id as string);
  }
});

// ── 5. partner_name sigue funcionando, incluso junto a partner_id ──
test("rewards_catalog.partner_id: partner_name sigue funcionando sin cambios, coexiste con partner_id (Test P0-2.3, backward compatibility)", async () => {
  const service = createServiceRoleClient();
  // Fila "legacy": solo partner_name, sin partner_id — exactamente como
  // cualquier Reward creado antes de esta migración.
  const { data: legacy, error: legacyError } = await service
    .from("rewards_catalog")
    .insert({ title: `P14.4-E legacy ${Date.now()}`, points_cost: 30, funding_type: "partner", partner_name: "Café de Prueba" })
    .select("id, partner_name, partner_id")
    .single();

  try {
    assert.equal(legacyError, null, legacyError?.message);
    assert.equal(legacy!.partner_name, "Café de Prueba", "partner_name debe seguir funcionando exactamente igual que antes de la migración");
    assert.equal(legacy!.partner_id, null, "una fila sin partner_id explícito debe seguir siendo NULL, nunca inferido de partner_name");
  } finally {
    if (legacy) await deactivateTestReward(legacy.id as string);
  }
});

// ── 6. La FK impide un Partner inexistente ──
test("rewards_catalog.partner_id: la FK rechaza un partner_id que no existe en partners (Test P0-2.4)", async () => {
  const service = createServiceRoleClient();
  const fakePartnerId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({ title: `P14.4-E FK inválida ${Date.now()}`, points_cost: 40, funding_type: "partner", partner_id: fakePartnerId })
    .select("id")
    .single();

  try {
    assert.ok(error, "insertar un partner_id inexistente debe fallar por violación de FK, nunca insertarse silenciosamente");
  } finally {
    if (data) await deactivateTestReward((data as { id: string }).id);
  }
});
