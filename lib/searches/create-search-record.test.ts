// F5-06 (VIAO_ROADMAP.md) — Tests de seguridad/RLS de `searches` contra
// Supabase local real (no un mock). Mismo motivo que F5-05
// (lib/supabase/service.test.ts) para no depender de `next/headers`: estos
// tests ejercitan directamente clientes `@supabase/supabase-js` (anon y un
// usuario real autenticado vía signUp), nunca `createSearchRecord()` en sí
// (que depende de `next/headers`, solo verificable dentro de una petición
// real de Next.js — ver el reporte de la fase para la verificación E2E vía
// navegador real).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createSearchRecord } from "./create-search-record";

const VALID_SEARCH_ROW = {
  destination: "Madrid (test F5-06)",
  check_in: "2026-10-01",
  check_out: "2026-10-04",
  guests: 2,
  rooms: 1,
  results_count: 3,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createConfirmedTestUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f506-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f506-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  // Borra vía la API de administración de auth.users, nunca vía un DELETE
  // directo sobre `searches` (esa tabla no tiene GRANT de DELETE para
  // ningún rol de cliente, ni siquiera `service_role` lo necesita aquí):
  // `profiles.id`/`searches.user_id` están declarados `ON DELETE CASCADE`
  // desde F1/F5-06, así que borrar el usuario limpia todo lo asociado.
  await service.auth.admin.deleteUser(userId);
}

// ── Resiliencia fuera de una petición real de Next.js (mismo criterio que F5-05) ──
test("createSearchRecord(): fuera de una petición real de Next.js devuelve undefined, no lanza", async () => {
  const result = await createSearchRecord({
    searchParams: {
      destination: "Madrid",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 1,
      rooms: 1,
    },
    resultsCount: 1,
  });

  assert.equal(result, undefined);
});

// ── RLS: anon no puede insertar en searches (sin GRANT para anon) ──
test("un cliente anon no puede insertar en searches (sin GRANT, Patrón A solo para authenticated)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("searches").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    ...VALID_SEARCH_ROW,
  });

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el insert desde el cliente anon");
});

// ── RLS: un usuario autenticado SÍ puede insertar su propia búsqueda ──
test("un usuario autenticado puede insertar su propia fila en searches (WITH CHECK user_id = auth.uid())", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();

  try {
    const { data, error } = await authedClient
      .from("searches")
      .insert({ user_id: userId, ...VALID_SEARCH_ROW })
      .select()
      .single();

    assert.equal(error, null, `insert falló: ${error?.message}`);
    assert.ok(data);
    assert.equal(data.user_id, userId);
    assert.equal(data.destination, VALID_SEARCH_ROW.destination);
    assert.equal(data.check_in, VALID_SEARCH_ROW.check_in);
    assert.equal(data.check_out, VALID_SEARCH_ROW.check_out);
    assert.equal(data.guests, VALID_SEARCH_ROW.guests);
    assert.equal(data.rooms, VALID_SEARCH_ROW.rooms);
    assert.equal(data.results_count, VALID_SEARCH_ROW.results_count);
    assert.ok(data.id);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: un usuario autenticado NO puede insertar una búsqueda a nombre de otro ──
test("un usuario autenticado NO puede insertar searches con un user_id ajeno (WITH CHECK lo impide)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();

  try {
    const foreignUserId = "11111111-1111-1111-1111-111111111111";
    const { error } = await authedClient
      .from("searches")
      .insert({ user_id: foreignUserId, ...VALID_SEARCH_ROW });

    assert.ok(error, "se esperaba que WITH CHECK rechazara un user_id distinto al propio");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Las CHECK constraints del esquema siguen activas también para el cliente autenticado ──
test("las CHECK constraints de searches (fechas/guests/rooms) siguen aplicando al insert autenticado", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();

  try {
    const { error: dateError } = await authedClient.from("searches").insert({
      user_id: userId,
      ...VALID_SEARCH_ROW,
      check_in: "2026-10-04",
      check_out: "2026-10-01",
    });
    assert.ok(dateError, "se esperaba que la CHECK de fechas rechazara check_out <= check_in");

    const { error: guestsError } = await authedClient.from("searches").insert({
      user_id: userId,
      ...VALID_SEARCH_ROW,
      guests: 0,
    });
    assert.ok(guestsError, "se esperaba que la CHECK de guests rechazara guests = 0");
  } finally {
    await deleteTestUser(userId);
  }
});
