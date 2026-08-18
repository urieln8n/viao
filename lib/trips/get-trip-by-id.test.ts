// F11-01 (VIAO_ROADMAP.md) — Tests de lectura/RLS de `trips` por id,
// contra Supabase local real. Mismo motivo que get-search-by-id.test.ts
// (F6-01) para no depender de `next/headers` en `getTripById()` en sí:
// solo se ejercita el camino "fuera de una petición real de Next.js";
// RLS/ownership real se prueba con clientes `@supabase/supabase-js`
// directos (anon + usuarios reales vía signUp).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getTripById } from "./get-trip-by-id";

const VALID_TRIP_ROW = { destination: "Madrid (test F11-01)" };

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1101-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1101-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("getTripById(): fuera de una petición real de Next.js devuelve undefined, no lanza", async () => {
  const result = await getTripById("11111111-2222-3333-4444-555555555555");
  assert.equal(result, undefined);
});

test("un usuario autenticado puede crear e insertar directamente su propio viaje (Patrón A, WITH CHECK user_id = auth.uid())", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data, error } = await authedClient
      .from("trips")
      .insert({ user_id: userId, ...VALID_TRIP_ROW })
      .select()
      .single();
    assert.equal(error, null, `insert falló: ${error?.message}`);
    assert.ok(data);
    assert.equal(data.user_id, userId);
    assert.equal(data.destination, VALID_TRIP_ROW.destination);
  } finally {
    await deleteTestUser(userId);
  }
});

test("un usuario autenticado NO puede insertar un viaje con un user_id ajeno (WITH CHECK lo impide)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const foreignUserId = "11111111-1111-1111-1111-111111111111";
    const { error } = await authedClient
      .from("trips")
      .insert({ user_id: foreignUserId, ...VALID_TRIP_ROW });
    assert.ok(error, "se esperaba que WITH CHECK rechazara un user_id distinto al propio");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un usuario autenticado puede leer su propio viaje por id (trips_select_own)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { data: inserted } = await authedClient
      .from("trips")
      .insert({ user_id: userId, ...VALID_TRIP_ROW })
      .select()
      .single();
    assert.ok(inserted);

    const { data: read } = await authedClient
      .from("trips")
      .select("id, destination")
      .eq("id", inserted.id)
      .maybeSingle();
    assert.ok(read);
    assert.equal(read.destination, VALID_TRIP_ROW.destination);
  } finally {
    await deleteTestUser(userId);
  }
});

test("un usuario autenticado NO puede leer el viaje de otro usuario por id", async () => {
  const owner = await signUpUser();
  const other = await signUpUser();
  try {
    const { data: inserted } = await owner.authedClient
      .from("trips")
      .insert({ user_id: owner.userId, ...VALID_TRIP_ROW })
      .select()
      .single();
    assert.ok(inserted);

    const { data: read, error } = await other.authedClient
      .from("trips")
      .select("id")
      .eq("id", inserted.id)
      .maybeSingle();
    assert.equal(error, null);
    assert.equal(read, null, "RLS debe filtrar silenciosamente el viaje ajeno");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});

test("un usuario autenticado NO puede modificar (UPDATE) el viaje de otro usuario", async () => {
  const owner = await signUpUser();
  const other = await signUpUser();
  try {
    const { data: inserted } = await owner.authedClient
      .from("trips")
      .insert({ user_id: owner.userId, ...VALID_TRIP_ROW })
      .select()
      .single();
    assert.ok(inserted);

    const { data: updated, error } = await other.authedClient
      .from("trips")
      .update({ destination: "Spoofed" })
      .eq("id", inserted.id)
      .select();
    assert.equal(error, null, "RLS filtra en vez de dar error explícito para UPDATE");
    assert.equal(updated?.length, 0, "el UPDATE ajeno no debe afectar ninguna fila");

    const { data: stillOriginal } = await owner.authedClient
      .from("trips")
      .select("destination")
      .eq("id", inserted.id)
      .single();
    assert.equal(stillOriginal?.destination, VALID_TRIP_ROW.destination);
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});

test("un cliente anon no puede leer ni insertar en trips", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error: selectError } = await anonClient.from("trips").select("id").limit(1);
  assert.ok(selectError, "se esperaba que el select anon fuera rechazado");

  const { error: insertError } = await anonClient
    .from("trips")
    .insert({ user_id: "00000000-0000-0000-0000-000000000000", ...VALID_TRIP_ROW });
  assert.ok(insertError, "se esperaba que el insert anon fuera rechazado");
});

test("la CHECK constraint de fechas de trips sigue aplicando al insert autenticado", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient.from("trips").insert({
      user_id: userId,
      destination: "Test",
      start_date: "2026-10-04",
      end_date: "2026-10-01",
    });
    assert.ok(error, "se esperaba que la CHECK de fechas rechazara end_date < start_date");
  } finally {
    await deleteTestUser(userId);
  }
});
