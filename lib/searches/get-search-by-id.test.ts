// F6-01 (VIAO_ROADMAP.md) — Tests de seguridad/RLS de la lectura de
// `searches` por id, contra Supabase local real (no un mock). Mismo motivo
// que F5-06 (create-search-record.test.ts) para no depender de
// `next/headers`: estos tests ejercitan directamente clientes
// `@supabase/supabase-js` (anon y usuarios reales vía signUp), nunca
// `getSearchById()` en sí (ver el reporte de la fase para la verificación
// E2E vía navegador real).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`) — ver el comando exacto en el reporte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getSearchById } from "./get-search-by-id";

const VALID_SEARCH_ROW = {
  destination: "Madrid (test F6-01)",
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

  const email = `f601-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f601-test-password-12345",
  });

  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session, "se esperaba sesión inmediata (enable_confirmations=false en local)");

  return { userId: data.user!.id, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

// ── Resiliencia fuera de una petición real de Next.js (mismo criterio que F5-06) ──
test("getSearchById(): fuera de una petición real de Next.js devuelve undefined, no lanza", async () => {
  const result = await getSearchById("11111111-2222-3333-4444-555555555555");
  assert.equal(result, undefined);
});

// ── RLS: el propietario puede leer su propia búsqueda, con los datos correctos ──
test("un usuario autenticado puede leer su propia búsqueda por id (searches_select_own)", async () => {
  const { userId, authedClient } = await createConfirmedTestUser();

  try {
    const { data: inserted, error: insertError } = await authedClient
      .from("searches")
      .insert({ user_id: userId, ...VALID_SEARCH_ROW })
      .select()
      .single();
    assert.equal(insertError, null, `insert falló: ${insertError?.message}`);

    const { data: read, error: readError } = await authedClient
      .from("searches")
      .select("id, destination, check_in, check_out, guests, rooms")
      .eq("id", inserted.id)
      .maybeSingle();

    assert.equal(readError, null);
    assert.ok(read);
    assert.equal(read.destination, VALID_SEARCH_ROW.destination);
    assert.equal(read.check_in, VALID_SEARCH_ROW.check_in);
    assert.equal(read.check_out, VALID_SEARCH_ROW.check_out);
    assert.equal(read.guests, VALID_SEARCH_ROW.guests);
    assert.equal(read.rooms, VALID_SEARCH_ROW.rooms);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: un usuario NO puede leer la búsqueda de otro (searches_select_own lo filtra) ──
test("un usuario autenticado NO puede leer la búsqueda de otro usuario por id", async () => {
  const owner = await createConfirmedTestUser();
  const other = await createConfirmedTestUser();

  try {
    const { data: inserted, error: insertError } = await owner.authedClient
      .from("searches")
      .insert({ user_id: owner.userId, ...VALID_SEARCH_ROW })
      .select()
      .single();
    assert.equal(insertError, null, `insert falló: ${insertError?.message}`);

    const { data: read, error: readError } = await other.authedClient
      .from("searches")
      .select("id")
      .eq("id", inserted.id)
      .maybeSingle();

    // RLS filtra la fila silenciosamente: sin error, pero sin datos —
    // exactamente el mismo comportamiento que produce `getSearchById()`
    // devolviendo `undefined` para un search_id ajeno.
    assert.equal(readError, null);
    assert.equal(read, null);
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});

// ── RLS: anon no puede leer ninguna búsqueda (sin GRANT de SELECT para anon) ──
test("un cliente anon no puede leer searches (sin GRANT, Patrón A solo para authenticated)", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error } = await anonClient.from("searches").select("id").limit(1);

  assert.ok(error, "se esperaba que RLS/GRANT rechazara el select desde el cliente anon");
});
