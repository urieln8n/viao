// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Tests de cancelRedemption()/cancel_redemption().

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { redeemReward } from "./redeem-reward";
import { cancelRedemption } from "./cancel-redemption";
import { markRedemptionFulfilled } from "./mark-redemption-fulfilled";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);
  const email = `bloque1-cancel-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({ email, password: "bloque1-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function grantPoints(userId: string, amount: number) {
  const service = createServiceRoleClient();
  await service.from("rewards_transactions").insert({ user_id: userId, amount, type: "earned", reason: "bloque1_test_earning" });
}

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

async function createTestReward(pointsCost: number): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("rewards_catalog")
    .insert({
      title: `Bloque 1 test reward ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points_cost: pointsCost,
      funding_type: "partner",
    })
    .select("id")
    .single();
  assert.equal(error, null, error?.message);
  return data!.id as string;
}

// rewards_catalog no concede DELETE a ningún rol (mismo criterio "nunca
// borrar" ya aplicado al resto de tablas tipo ledger/catálogo del
// proyecto): la única forma de retirar una fila de prueba es active=false,
// la misma que usaría el producto real para retirar un Reward. Evita que
// cada ejecución de la suite deje basura permanente y creciente en el
// catálogo real.
async function deactivateTestReward(rewardId: string) {
  const service = createServiceRoleClient();
  await service.from("rewards_catalog").update({ active: false }).eq("id", rewardId);
}

async function markFulfilledDirect(redemptionId: string) {
  // Igual que markRedemptionFulfilled(), pero inline aquí para no
  // depender de otro módulo en un test de cancel-redemption.
  const service = createServiceRoleClient();
  await service.from("reward_redemptions").update({ status: "fulfilled" }).eq("id", redemptionId);
}

// ── 7. Cancelación genera refund exactamente una vez ──
test("cancelRedemption: cancela una redención pending y devuelve los Points mediante una nueva transacción positiva", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId);
    await grantPoints(userId, 1000);
    rewardId = await createTestReward(300);

    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const balanceAfterRedeem = await getBalance(userId);
    assert.equal(balanceAfterRedeem, balanceBefore + 1000 - 300);

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "success");
    if (cancelResult.outcome !== "success") return;
    assert.equal(cancelResult.redemption.status, "cancelled");

    const balanceAfterCancel = await getBalance(userId);
    assert.equal(balanceAfterCancel, balanceBefore + 1000, "el refund debe devolver EXACTAMENTE los Points gastados");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 8. Cancelación duplicada no duplica el refund ──
test("cancelRedemption: cancelar dos veces la MISMA redención nunca genera un segundo refund", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId);
    await grantPoints(userId, 1000);
    rewardId = await createTestReward(300);

    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const first = await cancelRedemption(userId, redeemResult.redemption.id);
    const second = await cancelRedemption(userId, redeemResult.redemption.id);

    assert.equal(first.outcome, "success");
    assert.equal(second.outcome, "success");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 1000, "el saldo debe reflejar UN solo refund, nunca dos");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// No permitir cancelar una redención ya `fulfilled`.
test("cancelRedemption: rechaza cancelar una redención ya fulfilled", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    await grantPoints(userId, 1000);
    rewardId = await createTestReward(300);

    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    await markFulfilledDirect(redeemResult.redemption.id);

    const cancelResult = await cancelRedemption(userId, redeemResult.redemption.id);
    assert.equal(cancelResult.outcome, "cannot_cancel_fulfilled_redemption");
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

// ── 9. Ownership ──
test("cancelRedemption: un usuario no puede cancelar la redención de otro usuario", async () => {
  const { userId: owner } = await signUpUser();
  const { userId: attacker } = await signUpUser();
  let rewardId: string | undefined;
  try {
    await grantPoints(owner, 1000);
    rewardId = await createTestReward(300);
    const redeemResult = await redeemReward(owner, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const result = await cancelRedemption(attacker, redeemResult.redemption.id);
    assert.equal(result.outcome, "redemption_not_found", "el RPC filtra por user_id — ownership ajeno se trata igual que 'no existe'");
  } finally {
    await deleteTestUser(owner);
    await deleteTestUser(attacker);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});

test("cancelRedemption: una redención inexistente devuelve redemption_not_found", async () => {
  const { userId } = await signUpUser();
  try {
    const result = await cancelRedemption(userId, crypto.randomUUID());
    assert.equal(result.outcome, "redemption_not_found");
  } finally {
    await deleteTestUser(userId);
  }
});

// Fase D (auditoría independiente del Bloque 1, sección 6) — carrera real
// entre cancel_redemption() y markRedemptionFulfilled() sobre la MISMA
// redención pending. El análisis de la auditoría concluyó que el
// locking MVCC estándar de Postgres (tanto el `for update` explícito de
// cancel_redemption() como el lock implícito de cualquier UPDATE) hace
// que ambos órdenes posibles terminen en un estado consistente — este
// test lo demuestra empíricamente con Promise.all, sin asumir cuál de
// las dos operaciones "gana".
test("cancelRedemption: carrera real con markRedemptionFulfilled() sobre la misma redención nunca deja un estado inconsistente", async () => {
  const { userId } = await signUpUser();
  let rewardId: string | undefined;
  try {
    const balanceBefore = await getBalance(userId);
    await grantPoints(userId, 1000);
    rewardId = await createTestReward(300);

    const redeemResult = await redeemReward(userId, rewardId, crypto.randomUUID());
    assert.equal(redeemResult.outcome, "success");
    if (redeemResult.outcome !== "success") return;

    const [cancelResult, fulfillResult] = await Promise.all([
      cancelRedemption(userId, redeemResult.redemption.id),
      markRedemptionFulfilled(userId, redeemResult.redemption.id),
    ]);

    const service = createServiceRoleClient();
    const { data: finalRow } = await service
      .from("reward_redemptions")
      .select("status")
      .eq("id", redeemResult.redemption.id)
      .single();
    const finalStatus = finalRow!.status as string;
    const finalBalance = await getBalance(userId);

    if (finalStatus === "cancelled") {
      // La cancelación ganó la carrera: el fulfill concurrente no debe
      // haber tenido efecto (0 filas, WHERE status='pending' ya no
      // coincide tras el commit de la cancelación), y el refund debe
      // reflejarse EXACTAMENTE una vez.
      assert.equal(cancelResult.outcome, "success");
      assert.equal(fulfillResult.success, false, "si el estado final es cancelled, el fulfill concurrente no debe haber tenido efecto");
      assert.equal(finalBalance, balanceBefore + 1000, "refund aplicado exactamente una vez, ningún doble movimiento");
    } else if (finalStatus === "fulfilled") {
      // El fulfill ganó la carrera: la cancelación posterior debe
      // rechazarse explícitamente, sin generar ningún refund.
      assert.equal(fulfillResult.success, true);
      assert.equal(cancelResult.outcome, "cannot_cancel_fulfilled_redemption", "si el estado final es fulfilled, cancelRedemption() debe rechazar, nunca reembolsar");
      assert.equal(finalBalance, balanceBefore + 1000 - 300, "sin refund: el canje original sigue siendo el único movimiento económico");
    } else {
      assert.fail(`estado final inesperado tras la carrera: ${finalStatus}`);
    }
  } finally {
    await deleteTestUser(userId);
    if (rewardId) await deactivateTestReward(rewardId);
  }
});
