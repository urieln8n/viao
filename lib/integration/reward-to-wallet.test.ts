// F14-04 (VIAO_ROADMAP.md) — Test de integración: ganar Reward -> consultar
// Wallet, contra Supabase local real. Usa el mecanismo de Reward REAL ya
// existente (recompensa de reserva confirmada, F7-04/F11) — reutilizando
// `runFullBookingFlow` (lib/integration/test-helpers.ts, la misma
// composición usada por F14-03) en vez de inventar un flujo de "ganar"
// distinto o un `redeem`/canje que F7 no implementa todavía (confirmado
// explícitamente en el reporte de F12: `reward_redeemed` está definido en
// la taxonomía pero sin ningún emisor real en el código).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { createRewardTransaction } from "../rewards/create-reward-transaction";
import {
  signUpIntegrationUser,
  deleteIntegrationUser,
  runFullBookingFlow,
} from "./test-helpers";

const STAY = {
  checkIn: "2026-11-10",
  checkOut: "2026-11-13",
  guests: 2,
  rooms: 1,
};

test("F14-04: reserva confirmada real (F7-04/F11) genera una transacción real y el saldo de Wallet la refleja exactamente", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("reward-wallet-a");
  try {
    const { data: initialWallet } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();
    const initialBalance = initialWallet?.balance ?? 0;

    const result = await runFullBookingFlow({
      userId,
      authedClient,
      destination: "Madrid",
      ...STAY,
    });

    // 3 — la transacción real existe en rewards_transactions, correctamente relacionada con la reserva real.
    const service = createServiceRoleClient();
    const { data: rewardRow, error: rewardError } = await service
      .from("rewards_transactions")
      .select("user_id, amount, type, reason, reference_type, reference_id")
      .eq("reference_type", "booking")
      .eq("reference_id", result.bookingId)
      .single();
    assert.equal(rewardError, null);
    assert.ok(rewardRow);
    assert.equal(rewardRow.user_id, userId);
    assert.equal(rewardRow.type, "earned");
    assert.equal(rewardRow.reason, "booking");
    assert.ok(rewardRow.amount > 0);

    // 4/5 — el saldo de Wallet incluye EXACTAMENTE esa recompensa (más el saldo inicial real del usuario, p. ej. la de registro).
    const { data: walletAfter } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();
    assert.equal(walletAfter?.balance, initialBalance + rewardRow.amount, "el saldo debe incluir exactamente la recompensa nueva, sobre el saldo real previo");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

test("F14-04: una segunda recompensa válida se acumula correctamente en el saldo", async () => {
  const { userId, authedClient } = await signUpIntegrationUser("reward-wallet-accum");
  try {
    const { data: initialWallet } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();
    const initialBalance = initialWallet?.balance ?? 0;

    const first = await runFullBookingFlow({ userId, authedClient, destination: "Madrid", ...STAY });
    const { data: walletAfterFirst } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();

    // Segunda recompensa real: otra reserva confirmada distinta (mismo mecanismo, referencia distinta -> no colisiona con la idempotencia real).
    const second = await runFullBookingFlow({
      userId,
      authedClient,
      destination: "Barcelona",
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      guests: 2,
      rooms: 1,
    });
    const { data: walletAfterSecond } = await authedClient.from("rewards_wallets").select("balance").maybeSingle();

    assert.notEqual(first.bookingId, second.bookingId);
    assert.ok((walletAfterSecond?.balance ?? 0) > (walletAfterFirst?.balance ?? 0), "el saldo debe crecer con la segunda recompensa");

    const { data: transactions } = await authedClient
      .from("rewards_transactions")
      .select("amount")
      .eq("reason", "booking")
      .in("reference_id", [first.bookingId, second.bookingId]);
    const sumBookingRewards = (transactions ?? []).reduce((total: number, row: { amount: number }) => total + row.amount, 0);
    assert.equal(walletAfterSecond?.balance, initialBalance + sumBookingRewards, "el saldo final debe ser exactamente el saldo inicial más la suma real de ambas recompensas de reserva");
  } finally {
    await deleteIntegrationUser(userId);
  }
});

test("F14-04: usuario B no ve las recompensas de A, ni en rewards_transactions ni en rewards_wallets", async () => {
  const userA = await signUpIntegrationUser("reward-wallet-isolation-a");
  const userB = await signUpIntegrationUser("reward-wallet-isolation-b");
  try {
    await runFullBookingFlow({ userId: userA.userId, authedClient: userA.authedClient, destination: "Madrid", ...STAY });

    const { data: bSeesATransactions } = await userB.authedClient
      .from("rewards_transactions")
      .select("id")
      .eq("user_id", userA.userId);
    assert.equal((bSeesATransactions ?? []).length, 0, "B no debe poder leer ninguna transacción de A");

    const { data: bWallets } = await userB.authedClient.from("rewards_wallets").select("*");
    assert.equal(bWallets?.length, 1, "B debe ver únicamente su propia fila de wallet");
    assert.equal(bWallets![0].user_id, userB.userId);

    const { data: aWallet } = await userA.authedClient.from("rewards_wallets").select("balance").maybeSingle();
    assert.ok((aWallet?.balance ?? 0) > 0, "A sí debe tener saldo real tras su reserva confirmada");
  } finally {
    await deleteIntegrationUser(userA.userId);
    await deleteIntegrationUser(userB.userId);
  }
});

// ── F14-02/F14-04: gasto/canje NO existe todavía — no se inventa, se documenta ──
test("F14-02: no existe ningún mecanismo real de gasto/canje de Points (reward_redeemed sin emisor, confirmado en F12) — el ledger sigue siendo estrictamente append-only", async () => {
  const { userId } = await signUpIntegrationUser("reward-no-redeem");
  try {
    // createRewardTransaction (el único punto de escritura real del ledger) rechaza cualquier amount <= 0 — no hay forma real de "gastar" Points hoy.
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: -10, reason: "redemption" }),
      /amount debe ser positivo/,
    );
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: 0, reason: "redemption" }),
      /amount debe ser positivo/,
    );
  } finally {
    await deleteIntegrationUser(userId);
  }
});
