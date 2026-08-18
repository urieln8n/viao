// F7-04/F7-05 (VIAO_ROADMAP.md) — Test de la recompensa de registro.
//
// A diferencia del resto de F7, la recompensa de registro NO pasa por
// `createRewardTransaction()`: se otorga desde el trigger `handle_new_user()`
// (supabase/migrations/20260818120000_*.sql) — el único punto server-side
// fiable, ya que `app/(auth)/register/page.tsx` llama a
// `supabase.auth.signUp()` directamente desde el cliente, sin ninguna
// Server Action de registro (ver la auditoría del reporte de la fase).
// Por eso este test ejercita el camino REAL de producción (un `signUp()`
// real) en vez de invocar código de aplicación — es la única forma
// honesta de probar el trigger.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { REGISTRATION_REWARD_POINTS_PROVISIONAL } from "./rules";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

// ── 1/13. Registro genera una recompensa (exactamente una) ──
test("un registro real (signUp) crea automáticamente una única transacción reason='registration', con el monto provisional documentado", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f704-registration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f704-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  const userId = data.user!.id;

  try {
    const service = createServiceRoleClient();
    const { data: rows, error: readError } = await service
      .from("rewards_transactions")
      .select("amount, type, reason, reference_type, reference_id, user_id")
      .eq("user_id", userId)
      .eq("reason", "registration");

    assert.equal(readError, null);
    assert.equal(rows!.length, 1, "debe existir exactamente una transacción de registro, ni cero ni varias");
    assert.equal(rows![0].amount, REGISTRATION_REWARD_POINTS_PROVISIONAL);
    assert.equal(rows![0].type, "earned");
    assert.equal(rows![0].reference_type, null);
    assert.equal(rows![0].reference_id, null);
  } finally {
    await createServiceRoleClient().auth.admin.deleteUser(userId);
  }
});

// ── 9. La recompensa de registro no se duplica (refresh/reintento no vuelve a insertar en auth.users) ──
test("un segundo signUp con el MISMO email (ya registrado) no crea una segunda transacción de registro", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f704-duplicate-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({ email, password: "f704-test-password-12345" });
  assert.equal(error, null);
  const userId = data.user!.id;

  try {
    // Reintento con el mismo email: Supabase Auth lo rechaza (usuario ya
    // existe) sin volver a insertar en auth.users, así que el trigger no
    // puede dispararse una segunda vez.
    await anonClient.auth.signUp({ email, password: "f704-test-password-12345" });

    const service = createServiceRoleClient();
    const { data: rows, error: readError } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "registration");

    assert.equal(readError, null);
    assert.equal(rows!.length, 1, "un reintento de registro con el mismo email no debe duplicar la recompensa");
  } finally {
    await createServiceRoleClient().auth.admin.deleteUser(userId);
  }
});
