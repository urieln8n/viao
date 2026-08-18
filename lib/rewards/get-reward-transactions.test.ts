// F7-02/F7-03/F7-05 (VIAO_ROADMAP.md) — Tests del historial de
// transacciones para la UI de Wallet. Misma limitación que
// get-wallet-balance.test.ts: `getRewardTransactions()` depende de
// `next/headers`, así que su contrato de "fuera de una petición real"
// se ejercita directamente, y el ownership/orden se verifica con un
// cliente autenticado real haciendo la misma consulta.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createRewardTransaction } from "./create-reward-transaction";
import { getRewardTransactions } from "./get-reward-transactions";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f703-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f703-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("getRewardTransactions: fuera de una petición real de Next.js -> [], no lanza", async () => {
  const result = await getRewardTransactions();
  assert.deepEqual(result, []);
});

test("un usuario autenticado real solo ve sus propias transacciones, ordenadas de más reciente a más antigua", async () => {
  const { userId: userA, authedClient: clientA } = await createConfirmedTestUser();
  const { userId: userB } = await createConfirmedTestUser();
  try {
    await createRewardTransaction({ userId: userA, amount: 10, reason: "test-history-1" });
    await createRewardTransaction({ userId: userA, amount: 20, reason: "test-history-2" });
    await createRewardTransaction({ userId: userB, amount: 999, reason: "test-history-b" });

    const { data, error } = await clientA
      .from("rewards_transactions")
      .select("id, amount, reason, user_id, created_at")
      .order("created_at", { ascending: false });

    assert.equal(error, null);
    assert.ok(data!.every((row: { user_id: string }) => row.user_id === userA), "no debe incluir ninguna fila de otro usuario");
    assert.ok(!data!.some((row: { amount: number }) => row.amount === 999), "no debe incluir la transacción de userB");

    const reasons = data!.map((row: { reason: string }) => row.reason);
    const idxHistory2 = reasons.indexOf("test-history-2");
    const idxHistory1 = reasons.indexOf("test-history-1");
    assert.ok(idxHistory2 !== -1 && idxHistory1 !== -1 && idxHistory2 < idxHistory1, "debe estar ordenado de más reciente a más antigua");
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
  }
});
