// Bloque Partners PB2 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Tests de
// complete_partner_activity(). Usuario real vía signUp + createServiceRoleClient
// (mismo patrón exacto que lib/missions/complete-mission.test.ts y
// lib/rewards/redeem-reward.test.ts) — nunca simulado. PB2 no crea ningún
// wrapper TypeScript (eso es una decisión explícita de alcance de PB2: la
// Server Action llega en PB4) — todas las llamadas aquí invocan el RPC
// directamente vía `.rpc("complete_partner_activity", ...)`, igual que ya
// hace complete-mission.test.ts para probar el RPC con parámetros
// sintéticos.
//
// Igual que mission_completions, `partners`/`partner_activities` nunca
// reciben GRANT de DELETE para service_role (por diseño, PB1) — cualquier
// Partner/Actividad creada en estos tests queda PERMANENTEMENTE en la base
// local. Es el mismo comportamiento ya aceptado y documentado para
// mission_completions: cada Partner de test es una fila barata y aislada
// (un partner_id nuevo por test evita contaminar el kill-switch diario
// P3 de otro test); el pool mensual P4 es la única cifra global que se
// acumula entre ejecuciones, por lo que sus tests consultan el remanente
// real en vez de asumir que el pool empieza en 0.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";

const MONTHLY_POOL_LIMIT_POINTS = 3000;

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partners-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partners-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(): Promise<string> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Test Partner ${suffix}`, slug: `test-partner-${suffix}`, category: "restaurant", is_test: true })
    .select("id")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return data!.id as string;
}

function newAttemptId(): string {
  return crypto.randomUUID();
}

async function getBalance(userId: string): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service.from("rewards_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}

async function getPartnersPoolSpentThisMonth(): Promise<number> {
  const service = createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { data } = await service
    .from("partner_activities")
    .select("points_awarded")
    .gte("created_at", startOfMonth.toISOString());
  return (data ?? []).reduce((sum, row) => sum + (row.points_awarded as number), 0);
}

type CompleteResult =
  | { data: { id: string; points_awarded: number; attribution_mechanism: string }; error: null }
  | { data: null; error: { message: string } };

async function callRpc(
  client: SupabaseClient,
  params: {
    p_user_id: string;
    p_partner_id: string;
    p_attempt_id: string;
    p_declared_amount_eur: number;
    p_amount_confidence: "declared" | "confirmed_by_reservation";
  },
): Promise<CompleteResult> {
  const { data, error } = await client.rpc("complete_partner_activity", params);
  return { data, error } as CompleteResult;
}

// ── Idempotencia ──
test("complete_partner_activity: mismo attempt_id dos veces nunca duplica la Actividad ni los Points", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const balanceBefore = await getBalance(userId);
    const service = createServiceRoleClient();
    const attemptId = newAttemptId();
    const params = {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: attemptId,
      p_declared_amount_eur: 10,
      p_amount_confidence: "declared" as const,
    };

    const first = await callRpc(service, params);
    const second = await callRpc(service, params);
    assert.equal(first.error, null, first.error?.message);
    assert.equal(second.error, null, second.error?.message);
    assert.equal(first.data!.id, second.data!.id, "el segundo intento debe devolver exactamente la misma fila");

    const { data: activities } = await service
      .from("partner_activities")
      .select("id")
      .eq("attempt_id", attemptId);
    assert.equal(activities?.length, 1, "exactamente 1 fila en partner_activities, nunca 2");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore + 10, "solo UN otorgamiento de Points, a pesar de dos llamadas");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── P1: confirmed_by_reservation = 2 Points/€ ──
test("complete_partner_activity: amount_confidence='confirmed_by_reservation' otorga 2 Points/€ (P1)", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 15,
      p_amount_confidence: "confirmed_by_reservation",
    });
    assert.equal(result.error, null, result.error?.message);
    assert.equal(result.data!.points_awarded, 30, "15€ * 2 Points/€ = 30 Points (P1)");
    assert.equal(result.data!.attribution_mechanism, "reservation");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── P2: declared = 1 Point/€ ──
test("complete_partner_activity: amount_confidence='declared' otorga 1 Point/€ (P2)", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 15,
      p_amount_confidence: "declared",
    });
    assert.equal(result.error, null, result.error?.message);
    assert.equal(result.data!.points_awarded, 15, "15€ * 1 Point/€ = 15 Points (P2)");
    assert.equal(result.data!.attribution_mechanism, "qr");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Ledger único: reason/reference_type/reference_id correctos ──
test("complete_partner_activity: la transacción del ledger tiene reason/reference_type/reference_id correctos", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 5,
      p_amount_confidence: "declared",
    });
    assert.equal(result.error, null, result.error?.message);

    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("reason, reference_type, reference_id, amount, type")
      .eq("user_id", userId)
      .eq("reason", "partner_activity")
      .single();
    assert.ok(transaction, "debe existir la transacción del ledger");
    assert.equal(transaction!.reference_type, "partner_activity");
    assert.equal(transaction!.reference_id, result.data!.id, "reference_id debe apuntar exactamente a la fila de partner_activities");
    assert.equal(transaction!.amount, 5);
    assert.equal(transaction!.type, "earned");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── P3: kill-switch diario ──
test("complete_partner_activity: P3 — 1ª y 2ª Actividad del día OK, 3ª rechazada sin filas parciales", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const first = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 1,
      p_amount_confidence: "declared",
    });
    const second = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 1,
      p_amount_confidence: "declared",
    });
    assert.equal(first.error, null, first.error?.message);
    assert.equal(second.error, null, second.error?.message);

    const thirdAttemptId = newAttemptId();
    const third = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: thirdAttemptId,
      p_declared_amount_eur: 1,
      p_amount_confidence: "declared",
    });
    assert.ok(third.error, "la 3ª Actividad del mismo (usuario, Partner) en el mismo día debe rechazarse");
    assert.ok(
      third.error!.message.includes("partner_daily_limit_exceeded"),
      `mensaje inesperado: ${third.error!.message}`,
    );

    const { data: activitiesForPair } = await service
      .from("partner_activities")
      .select("id")
      .eq("user_id", userId)
      .eq("partner_id", partnerId);
    assert.equal(activitiesForPair?.length, 2, "exactamente 2 Actividades para el par (usuario, Partner), nunca 3");

    const { data: thirdRow } = await service
      .from("partner_activities")
      .select("id")
      .eq("attempt_id", thirdAttemptId);
    assert.equal(thirdRow?.length, 0, "el intento rechazado no debe dejar ninguna fila parcial");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── P4/P5: pool mensual — con margen ──
test("complete_partner_activity: P4 — con margen en el pool, los Points se emiten normalmente", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const alreadySpent = await getPartnersPoolSpentThisMonth();
    const remaining = MONTHLY_POOL_LIMIT_POINTS - alreadySpent;
    if (remaining < 10) {
      // Pool real del mes ya agotado por ejecuciones anteriores de esta
      // misma suite (esperado con el tiempo, sin GRANT de DELETE) — no es
      // un fallo, el siguiente test ya cubre exactamente ese caso.
      return;
    }

    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 10,
      p_amount_confidence: "declared",
    });
    assert.equal(result.error, null, result.error?.message);
    assert.equal(result.data!.points_awarded, 10, "con margen suficiente, se otorgan los Points calculados");

    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("reference_type", "partner_activity")
      .eq("reference_id", result.data!.id)
      .maybeSingle();
    assert.ok(transaction, "con margen, debe existir la transacción del ledger");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── P4/P5: pool mensual agotado ──
test("complete_partner_activity: P5 — pool agotado registra la Actividad con points_awarded=0, sin rewards_transactions, sin bloquear", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  const fillerPartnerId = await createTestPartner(); // Partner distinto para no chocar con el kill-switch diario (P3) del par bajo prueba.
  try {
    const service = createServiceRoleClient();
    const alreadySpent = await getPartnersPoolSpentThisMonth();
    const remaining = MONTHLY_POOL_LIMIT_POINTS - alreadySpent;
    const fillerNeeded = remaining - 5; // deja menos margen (5) que el coste de la Actividad de prueba (10 Points).
    if (fillerNeeded > 0) {
      const { error } = await service.from("partner_activities").insert({
        partner_id: fillerPartnerId,
        user_id: userId,
        attribution_mechanism: "qr",
        declared_amount_eur: 1,
        amount_confidence: "declared",
        points_awarded: fillerNeeded,
        attempt_id: newAttemptId(),
      });
      assert.equal(error, null, error?.message);
    }

    const balanceBefore = await getBalance(userId);
    const attemptId = newAttemptId();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: attemptId,
      p_declared_amount_eur: 10,
      p_amount_confidence: "declared",
    });

    assert.equal(result.error, null, result.error?.message);
    assert.ok(result.data, "la Actividad debe registrarse SIEMPRE, incluso sin margen en el pool (P5)");
    assert.equal(result.data!.points_awarded, 0, "sin margen, points_awarded debe ser exactamente 0 (P5/P6)");

    const balanceAfter = await getBalance(userId);
    assert.equal(balanceAfter, balanceBefore, "sin margen, el saldo del usuario no debe cambiar — ningún rewards_transaction");

    const { data: transaction } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("reference_type", "partner_activity")
      .eq("reference_id", result.data!.id)
      .maybeSingle();
    assert.equal(transaction, null, "sin margen, NO debe existir ninguna fila en rewards_transactions para esta Actividad");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Concurrencia sobre P3 ──
test("complete_partner_activity: concurrencia real sobre P3 — nunca más de 2 Actividades para el mismo (usuario, Partner) en el día", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const CONCURRENT_CALLS = 6;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () =>
        callRpc(service, {
          p_user_id: userId,
          p_partner_id: partnerId,
          p_attempt_id: newAttemptId(),
          p_declared_amount_eur: 1,
          p_amount_confidence: "declared",
        }),
      ),
    );

    const succeeded = results.filter((r) => r.error === null);
    const rejected = results.filter((r) => r.error !== null);
    assert.equal(succeeded.length, 2, "bajo concurrencia real, exactamente 2 de las 6 llamadas deben tener éxito (límite diario P3)");
    assert.equal(rejected.length, CONCURRENT_CALLS - 2);
    for (const r of rejected) {
      assert.ok(
        r.error!.message.includes("partner_daily_limit_exceeded"),
        `mensaje inesperado: ${r.error!.message}`,
      );
    }

    const { data: activities } = await service
      .from("partner_activities")
      .select("id")
      .eq("user_id", userId)
      .eq("partner_id", partnerId);
    assert.equal(activities?.length, 2, "exactamente 2 filas bajo concurrencia real, nunca más — el lock serializa el kill-switch");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Concurrencia con el mismo attempt_id ──
test("complete_partner_activity: concurrencia real con el mismo attempt_id -> exactamente 1 Actividad y 1 transacción", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const attemptId = newAttemptId();
    const CONCURRENT_CALLS = 8;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () =>
        callRpc(service, {
          p_user_id: userId,
          p_partner_id: partnerId,
          p_attempt_id: attemptId,
          p_declared_amount_eur: 3,
          p_amount_confidence: "declared",
        }),
      ),
    );

    for (const r of results) {
      assert.equal(r.error, null, r.error?.message);
    }
    const distinctIds = new Set(results.map((r) => r.data!.id));
    assert.equal(distinctIds.size, 1, "todas las llamadas concurrentes con el mismo attempt_id deben devolver la MISMA fila");

    const { data: activities } = await service.from("partner_activities").select("id").eq("attempt_id", attemptId);
    assert.equal(activities?.length, 1, "exactamente 1 fila en partner_activities bajo concurrencia real con el mismo attempt_id");

    const { data: transactions } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("reference_type", "partner_activity")
      .eq("reference_id", [...distinctIds][0]);
    assert.equal(transactions?.length, 1, "exactamente 1 transacción en el ledger, nunca una por cada llamada concurrente");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Concurrencia sobre P4 (pool mensual) ──
test("complete_partner_activity: concurrencia real sobre P4 — el pool mensual nunca se supera bajo llamadas simultáneas", async () => {
  const { userId } = await signUpUser();
  try {
    const service = createServiceRoleClient();
    const alreadySpent = await getPartnersPoolSpentThisMonth();
    const remaining = MONTHLY_POOL_LIMIT_POINTS - alreadySpent;
    if (remaining < 5) {
      // Sin margen suficiente para aislar el caso "con margen parcial"
      // en el mes actual — limitación conocida (sin DELETE), no un fallo.
      return;
    }

    // Deja margen para exactamente 1 Actividad de 1 Point, usando un
    // Partner distinto por llamada para que P3 (límite diario por par)
    // nunca sea el factor limitante — solo P4 debe decidir el resultado.
    const fillerPartnerId = await createTestPartner();
    const fillerNeeded = remaining - 1;
    if (fillerNeeded > 0) {
      const { error } = await service.from("partner_activities").insert({
        partner_id: fillerPartnerId,
        user_id: userId,
        attribution_mechanism: "qr",
        declared_amount_eur: 1,
        amount_confidence: "declared",
        points_awarded: fillerNeeded,
        attempt_id: newAttemptId(),
      });
      assert.equal(error, null, error?.message);
    }

    const CONCURRENT_CALLS = 5;
    const partnerIds = await Promise.all(Array.from({ length: CONCURRENT_CALLS }, () => createTestPartner()));
    const results = await Promise.all(
      partnerIds.map((pid) =>
        callRpc(service, {
          p_user_id: userId,
          p_partner_id: pid,
          p_attempt_id: newAttemptId(),
          p_declared_amount_eur: 1,
          p_amount_confidence: "declared",
        }),
      ),
    );

    for (const r of results) {
      assert.equal(r.error, null, `P4 nunca bloquea la Actividad — siempre se registra (P5). Error: ${r.error?.message}`);
    }
    const totalPointsAwarded = results.reduce((sum, r) => sum + r.data!.points_awarded, 0);
    assert.equal(totalPointsAwarded, 1, "con margen para exactamente 1 Point, solo UNA de las llamadas concurrentes debe recibir Points — el resto, 0 (lock serializa el pool)");

    const spentAfter = await getPartnersPoolSpentThisMonth();
    assert.ok(spentAfter <= MONTHLY_POOL_LIMIT_POINTS, "el pool mensual nunca debe superarse, ni siquiera bajo concurrencia real");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Validaciones ──
test("complete_partner_activity: declared_amount_eur inválido se rechaza (fail-closed)", async () => {
  const { userId } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 0,
      p_amount_confidence: "declared",
    });
    assert.ok(result.error, "declared_amount_eur=0 debe rechazarse");
    assert.ok(result.error!.message.includes("invalid_declared_amount"));
  } finally {
    await deleteTestUser(userId);
  }
});

test("complete_partner_activity: Partner inexistente/inactivo se rechaza", async () => {
  const { userId } = await signUpUser();
  try {
    const service = createServiceRoleClient();
    const result = await callRpc(service, {
      p_user_id: userId,
      p_partner_id: crypto.randomUUID(),
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 10,
      p_amount_confidence: "declared",
    });
    assert.ok(result.error, "un partner_id inexistente debe rechazarse");
    assert.ok(result.error!.message.includes("partner_not_found_or_inactive"));
  } finally {
    await deleteTestUser(userId);
  }
});

test("complete_partner_activity: usuario inexistente se rechaza", async () => {
  const partnerId = await createTestPartner();
  const service = createServiceRoleClient();
  const result = await callRpc(service, {
    p_user_id: crypto.randomUUID(),
    p_partner_id: partnerId,
    p_attempt_id: newAttemptId(),
    p_declared_amount_eur: 10,
    p_amount_confidence: "declared",
  });
  assert.ok(result.error, "un user_id inexistente debe rechazarse");
  assert.ok(result.error!.message.includes("user_not_found"));
});

// ── Seguridad ──
test("complete_partner_activity: no es invocable directamente por un cliente autenticado (solo service_role)", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partnerId = await createTestPartner();
  try {
    const { error } = await sessionClient.rpc("complete_partner_activity", {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_attempt_id: newAttemptId(),
      p_declared_amount_eur: 10,
      p_amount_confidence: "declared",
    });
    assert.ok(error, "un cliente autenticado no debe poder invocar complete_partner_activity() directamente — EXECUTE revocado");
  } finally {
    await deleteTestUser(userId);
  }
});
