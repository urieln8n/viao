// F7-02/F7-05 (VIAO_ROADMAP.md) — Tests de la lectura del saldo de
// Points. `getWalletBalance()` depende de `next/headers` (a través de
// `createClient()` de `lib/supabase/server.ts`), así que solo su contrato
// de "fuera de una petición real -> undefined, nunca lanza" es
// ejercitable invocándola directamente aquí — misma limitación ya
// documentada en get-search-by-id.test.ts (F6-01) y en
// app/booking/[propertyId]/status/resolve.test.ts (F6-05). El resto de la
// cobertura obligatoria (saldo = suma real, ownership) se ejercita con un
// cliente `@supabase/supabase-js` autenticado real haciendo EXACTAMENTE la
// misma consulta que la función (RLS real, sin mocks) — mismo patrón que
// F6-05 usó para `bookings`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createRewardTransaction } from "./create-reward-transaction";
import { getWalletBalance } from "./get-wallet-balance";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f702-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f702-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("getWalletBalance: fuera de una petición real de Next.js -> undefined, no lanza", async () => {
  const result = await getWalletBalance();
  assert.equal(result, undefined);
});

test("un cliente anon no puede leer rewards_wallets (sin GRANT ni policy)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("rewards_wallets").select("*");
  assert.ok(error, "se esperaba que RLS/GRANT rechazara el SELECT desde el cliente anon");
});

// ── 3/4. Saldo = suma del ledger, varias transacciones suman correctamente ──
test("rewards_wallets.balance coincide exactamente con SUM(rewards_transactions.amount) para el mismo usuario (misma consulta que getWalletBalance)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  try {
    // El trigger de registro (F7-04) ya creó una transacción para este
    // usuario nuevo — se parte de ese estado real, sin asumir 0.
    const { data: initial } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();
    const initialBalance = initial?.balance ?? 0;

    await createRewardTransaction({ userId, amount: 30, reason: "test-sum-a" });
    await createRewardTransaction({ userId, amount: 25, reason: "test-sum-b" });

    const { data: wallet, error: walletError } = await authedClient
      .from("rewards_wallets")
      .select("balance")
      .maybeSingle();
    assert.equal(walletError, null);

    const { data: transactions, error: txError } = await authedClient
      .from("rewards_transactions")
      .select("amount")
      .eq("user_id", userId);
    assert.equal(txError, null);

    const sum = (transactions ?? []).reduce((total: number, row: { amount: number }) => total + row.amount, 0);

    assert.equal(wallet!.balance, sum, "rewards_wallets.balance debe ser exactamente igual a la suma real del ledger");
    assert.equal(wallet!.balance, initialBalance + 30 + 25);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 5. Usuario A no puede leer el saldo de B ──
test("RLS (security_invoker): un usuario NO puede leer el saldo de otro usuario, solo el propio", async () => {
  const { userId: userA, authedClient: clientA } = await createConfirmedTestUser();
  const { userId: userB, authedClient: clientB } = await createConfirmedTestUser();
  try {
    await createRewardTransaction({ userId: userA, amount: 500, reason: "test-ownership-a" });
    await createRewardTransaction({ userId: userB, amount: 7, reason: "test-ownership-b" });

    const { data: walletsAsA } = await clientA.from("rewards_wallets").select("*");
    // Debe ver ÚNICAMENTE su propia fila, nunca la de B (con 500 puntos).
    assert.equal(walletsAsA!.length, 1);
    assert.equal(walletsAsA![0].user_id, userA);
    assert.notEqual(walletsAsA![0].balance, 500 + 7, "no debe sumar el saldo de otro usuario en el suyo");

    const { data: walletsAsB } = await clientB.from("rewards_wallets").select("*");
    assert.equal(walletsAsB!.length, 1);
    assert.equal(walletsAsB![0].user_id, userB);
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
  }
});
