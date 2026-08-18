// F7-01/F7-05 (VIAO_ROADMAP.md) — Tests de la creación de transacciones de
// recompensa contra Supabase local real (no un mock). `createRewardTransaction`
// usa `createServiceRoleClient()` (sin `next/headers`), así que es
// totalmente ejercitable aquí — mismo patrón que
// lib/bookings/create-booking-record.test.ts (F6-02).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte de la
// fase.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createRewardTransaction } from "./create-reward-transaction";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f701-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f701-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

// El trigger de registro (F7-04) ya crea una fila 'registration' para
// cada usuario nuevo (ver registration-reward.test.ts) — se limpia antes
// de cada test que necesite partir de un ledger vacío, usando el propio
// service_role (SELECT+INSERT únicamente; sin DELETE, así que se limpia
// vía superusuario, mismo patrón ya establecido en F6-02/F6-03 para datos
// de prueba).
async function deleteAllTransactionsFor(userId: string) {
  execSync(
    `docker exec supabase_db_VIAO psql -U postgres -d postgres -c "delete from public.rewards_transactions where user_id = '${userId}';"`,
  );
}

// ── 1/6. Crear recompensa (genérica, sin referencia) — camino no usado en
// producción (el registro real pasa por el trigger, ver registration-reward.test.ts)
// pero debe seguir siendo representable y correcto ──
test("createRewardTransaction: crea una transacción sin referencia (p. ej. reason='registration' usado de forma genérica)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    await deleteAllTransactionsFor(userId);

    const result = await createRewardTransaction({
      userId,
      amount: 100,
      reason: "registration",
    });

    assert.equal(result.created, true);
    assert.ok(result.id);

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("rewards_transactions")
      .select("user_id, amount, type, reason, reference_type, reference_id")
      .eq("id", result.id)
      .single();

    assert.equal(error, null);
    assert.equal(data.user_id, userId);
    assert.equal(data.amount, 100);
    assert.equal(data.type, "earned");
    assert.equal(data.reason, "registration");
    assert.equal(data.reference_type, null);
    assert.equal(data.reference_id, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 2. Crear recompensa de reserva (con referencia) ──
test("createRewardTransaction: crea una transacción con referencia (reason='booking'), correctamente relacionada", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const fakeBookingId = "11111111-1111-1111-1111-111111111111";
    const result = await createRewardTransaction({
      userId,
      amount: 50,
      reason: "booking",
      referenceType: "booking",
      referenceId: fakeBookingId,
    });

    assert.equal(result.created, true);

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("rewards_transactions")
      .select("reason, reference_type, reference_id, amount")
      .eq("id", result.id)
      .single();

    assert.equal(error, null);
    assert.equal(data.reason, "booking");
    assert.equal(data.reference_type, "booking");
    assert.equal(data.reference_id, fakeBookingId);
    assert.equal(data.amount, 50);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 9/10. Idempotencia: no se duplica una recompensa con referencia ──
test("createRewardTransaction: una segunda llamada con la misma referencia no crea una fila nueva (idempotencia real, vía UNIQUE)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const fakeBookingId = "22222222-2222-2222-2222-222222222222";
    const first = await createRewardTransaction({
      userId,
      amount: 50,
      reason: "booking",
      referenceType: "booking",
      referenceId: fakeBookingId,
    });
    assert.equal(first.created, true);

    const second = await createRewardTransaction({
      userId,
      amount: 50,
      reason: "booking",
      referenceType: "booking",
      referenceId: fakeBookingId,
    });
    assert.equal(second.created, false, "la segunda llamada debe detectar el duplicado, no crear otra fila");
    assert.equal(second.id, first.id, "debe devolver el id de la fila ya existente");

    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reference_id", fakeBookingId);
    assert.equal(count, 1, "solo debe existir 1 fila para esa referencia, pese a las 2 llamadas");
  } finally {
    await deleteTestUser(userId);
  }
});

test("createRewardTransaction: idempotencia también bajo llamadas concurrentes (simulando un doble envío/reintento simultáneo)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const fakeBookingId = "33333333-3333-3333-3333-333333333333";
    const [a, b] = await Promise.all([
      createRewardTransaction({ userId, amount: 50, reason: "booking", referenceType: "booking", referenceId: fakeBookingId }),
      createRewardTransaction({ userId, amount: 50, reason: "booking", referenceType: "booking", referenceId: fakeBookingId }),
    ]);

    assert.equal(a.id, b.id, "ambas llamadas concurrentes deben resolver al mismo id");
    // Exactamente una de las dos debe reportar created=true (la que ganó la carrera a nivel de Postgres);
    // ambas podrían reportar created=false si hubo una lectura de recuperación en ambas, pero nunca deben crear 2 filas.
    const service = createServiceRoleClient();
    const { count } = await service
      .from("rewards_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reference_id", fakeBookingId);
    assert.equal(count, 1, "una carrera concurrente nunca debe producir 2 filas");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Validaciones defensivas ──
test("createRewardTransaction: amount debe ser positivo (F7 no implementa gasto/canje todavía)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: 0, reason: "booking", referenceType: "booking", referenceId: "44444444-4444-4444-4444-444444444444" }),
      /amount debe ser positivo/,
    );
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: -10, reason: "booking", referenceType: "booking", referenceId: "44444444-4444-4444-4444-444444444444" }),
      /amount debe ser positivo/,
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("createRewardTransaction: referenceType y referenceId deben proporcionarse juntos, o ninguno", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: 10, reason: "booking", referenceType: "booking" }),
      /referenceType y referenceId deben proporcionarse juntos/,
    );
    await assert.rejects(
      () => createRewardTransaction({ userId, amount: 10, reason: "booking", referenceId: "55555555-5555-5555-5555-555555555555" }),
      /referenceType y referenceId deben proporcionarse juntos/,
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ── 6/7/8. El cliente no puede escribir directamente sobre rewards_transactions ──
test("un cliente anon no puede insertar en rewards_transactions (sin GRANT ni policy)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("rewards_transactions").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    amount: 1000000,
    type: "earned",
    reason: "fraud",
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});

test("un usuario autenticado NO puede insertar en rewards_transactions directamente, ni siquiera con su propio user_id (Patrón B: solo service_role)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  try {
    const { error } = await authedClient.from("rewards_transactions").insert({
      user_id: userId,
      amount: 1000000,
      type: "earned",
      reason: "self-awarded",
    });

    assert.ok(
      error,
      "se esperaba que se rechazara el insert: rewards_transactions solo tiene policy de SELECT para authenticated",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("service_role NO tiene GRANT de UPDATE ni DELETE sobre rewards_transactions (ledger append-only)", async () => {
  const { userId } = await createConfirmedTestUser();
  try {
    const result = await createRewardTransaction({ userId, amount: 10, reason: "test-immutability" });

    const service = createServiceRoleClient();
    const { error: updateError } = await service
      .from("rewards_transactions")
      .update({ amount: 99999 })
      .eq("id", result.id);
    assert.ok(updateError, "se esperaba que Postgres rechazara el UPDATE: la migración F7-01 concede únicamente SELECT+INSERT");

    const { error: deleteError } = await service.from("rewards_transactions").delete().eq("id", result.id);
    assert.ok(deleteError, "se esperaba que Postgres rechazara el DELETE");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un usuario autenticado no puede hacer UPDATE ni DELETE sobre rewards_transactions", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();
  try {
    const result = await createRewardTransaction({ userId, amount: 10, reason: "test-immutability-client" });

    const { error: updateError } = await authedClient
      .from("rewards_transactions")
      .update({ amount: 99999 })
      .eq("id", result.id);
    assert.ok(updateError, "se esperaba que se rechazara el UPDATE desde el cliente autenticado");

    const { error: deleteError } = await authedClient.from("rewards_transactions").delete().eq("id", result.id);
    assert.ok(deleteError, "se esperaba que se rechazara el DELETE desde el cliente autenticado");
  } finally {
    await deleteTestUser(userId);
  }
});
