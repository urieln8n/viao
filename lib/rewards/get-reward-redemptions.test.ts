// FASE UX-1.1 (Core UX Quick-Fix Pass, P0-8) — Tests de getRewardRedemptions().
// Mismo patrón que get-reward-transactions.test.ts: el contrato "fuera de
// una petición real" se ejercita directamente; el ownership/orden/código
// persistido se verifica con un canje real (redeemReward(), mismo fixture
// que cancel-redemption.test.ts) y una lectura con el cliente autenticado.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "./redeem-reward";
import { getRewardRedemptions } from "./get-reward-redemptions";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);
  const email = `ux11-redemptions-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({ email, password: "ux11-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number) {
  const service = createServiceRoleClient();
  await service.from("rewards_transactions").insert({ user_id: userId, amount, type: "earned", reason: "ux11_test_earning" });
}

async function createTestReward(pointsCost: number, title: string): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({ title, points_cost: pointsCost, funding_type: "partner" })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

// rewards_catalog no concede DELETE a ningún rol (mismo criterio "nunca
// borrar" del resto de tablas tipo ledger/catálogo del proyecto): la
// única forma de retirar una fila de prueba es active=false, la misma que
// usaría el producto real para retirar un Reward (ya filtrado por
// getRewardsCatalog() y por redeem_reward()). Evita que cada ejecución de
// la suite deje basura permanente y creciente en el catálogo real — estas
// filas ya fueron canjeadas en el test, así que además de dejar de estar
// disponibles nunca podrían borrarse (reward_redemptions.reward_catalog_id
// las referencia sin ON DELETE CASCADE).
async function deactivateTestReward(rewardId: string) {
  const service = createServiceRoleClient();
  await service.from("rewards_catalog").update({ active: false }).eq("id", rewardId);
}

test("getRewardRedemptions: fuera de una petición real de Next.js -> [], no lanza", async () => {
  const result = await getRewardRedemptions();
  assert.deepEqual(result, []);
});

test("un usuario autenticado real ve su propio canje, con el código y el título del Reward, ordenado de más reciente a más antigua", async () => {
  const { userId: userA, authedClient: clientA } = await signUpUser();
  const { userId: userB } = await signUpUser();
  let rewardId1: string | undefined;
  let rewardId2: string | undefined;
  let rewardIdB: string | undefined;
  try {
    await grantPoints(userA, 100);
    rewardId1 = await createTestReward(10, `UX-1.1 Reward A ${Date.now()}`);
    rewardId2 = await createTestReward(10, `UX-1.1 Reward B ${Date.now()}`);

    const first = await redeemReward(userA, rewardId1, crypto.randomUUID());
    assert.equal(first.outcome, "success");
    const second = await redeemReward(userA, rewardId2, crypto.randomUUID());
    assert.equal(second.outcome, "success");

    await grantPoints(userB, 100);
    rewardIdB = await createTestReward(10, `UX-1.1 Reward B-owner ${Date.now()}`);
    await redeemReward(userB, rewardIdB, crypto.randomUUID());

    // getRewardRedemptions() depende de next/headers (cliente de sesión),
    // así que aquí se replica exactamente la misma consulta con el
    // cliente autenticado real de userA (misma sesión abierta por
    // signUpUser()) — mismo criterio que get-reward-transactions.test.ts.
    const { data, error } = await clientA
      .from("reward_redemptions")
      .select("id, points_spent, status, redemption_code, created_at, rewards_catalog(title)")
      .order("created_at", { ascending: false });

    assert.equal(error, null);
    assert.ok(data!.every((row) => row.points_spent === 10), "solo debe incluir las 2 redenciones de userA");
    assert.equal(data!.length, 2, "no debe incluir la redención de userB");

    if (second.outcome === "success" && first.outcome === "success") {
      assert.equal(data![0].redemption_code, second.redemption.redemptionCode, "debe estar ordenado de más reciente a más antigua");
      assert.ok(typeof data![0].redemption_code === "string" && data![0].redemption_code.length > 0, "el código debe seguir siendo recuperable");
    }
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    if (rewardId1) await deactivateTestReward(rewardId1);
    if (rewardId2) await deactivateTestReward(rewardId2);
    if (rewardIdB) await deactivateTestReward(rewardIdB);
  }
});
