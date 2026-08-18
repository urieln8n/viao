// F5-05 (VIAO_ROADMAP.md) — Tests del cliente de servicio contra Supabase
// local real (no un mock): confirma que `service_role` puede escribir en
// `analytics_events` (RLS activo, sin ninguna política) y que la clave
// `anon` NO puede — exactamente la garantía de seguridad que exige F5-05
// ("los eventos no pueden ser creados arbitrariamente por un usuario desde
// el cliente").
//
// Requiere Supabase local arrancado (`npx supabase start`) y las variables
// de entorno de ese stack local pasadas por el propio proceso (nunca
// `.env.local`, igual que el patrón ya usado en F3 para pruebas reales) —
// ver el comando exacto en el reporte de la fase.
//
// No usa `lib/supabase/server.ts` (depende de `next/headers`, que solo
// funciona dentro de una petición real de Next.js): estos tests solo
// ejercitan `createServiceRoleClient()` (sin `next/headers`) y un cliente
// `anon` construido directamente con `@supabase/supabase-js`, ambos
// ejecutables fuera de Next.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "./service";

const TEST_METADATA = { __f505_test: true, marker: `service-test-${Date.now()}` };

test("createServiceRoleClient(): puede insertar y leer en analytics_events (RLS activo, sin políticas)", async () => {
  const service = createServiceRoleClient();

  const { data: inserted, error: insertError } = await service
    .from("analytics_events")
    .insert({ event_name: "search_started", user_id: null, metadata: TEST_METADATA })
    .select()
    .single();

  assert.equal(insertError, null);
  assert.ok(inserted);
  assert.equal(inserted.event_name, "search_started");
  assert.deepEqual(inserted.metadata, TEST_METADATA);
  assert.equal(inserted.user_id, null);

  const { data: rows, error: selectError } = await service
    .from("analytics_events")
    .select("*")
    .eq("id", inserted.id);

  assert.equal(selectError, null);
  assert.equal(rows?.length, 1);

  // Sin limpieza vía `service_role`: por diseño (VIAO_DATABASE.md sección
  // 12, "Modificar/Eliminar: nadie") esta migración de F5-05 solo concede
  // SELECT + INSERT, nunca DELETE — `analytics_events` es un log de
  // solo-inserción, y este test no debe pedir un privilegio más amplio
  // solo por conveniencia. La fila de prueba (marcada con
  // `__f505_test: true`) se limpia aparte, como superusuario, fuera de
  // este test — ver el reporte de la fase.
});

test("un cliente anon (RLS sin políticas para authenticated/anon) NO puede insertar en analytics_events", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(supabaseUrl, "falta NEXT_PUBLIC_SUPABASE_URL en el entorno de prueba");
  assert.ok(anonKey, "falta NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno de prueba");

  const anonClient = createClient(supabaseUrl!, anonKey!);

  const { error } = await anonClient
    .from("analytics_events")
    .insert({ event_name: "search_started", metadata: TEST_METADATA });

  assert.ok(error, "se esperaba que RLS rechazara el insert desde el cliente anon");
});

test("createServiceRoleClient(): lanza un error claro si faltan las variables de entorno", () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    assert.throws(() => createServiceRoleClient(), /SUPABASE_SERVICE_ROLE_KEY/);
  } finally {
    if (originalKey !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  }
});
