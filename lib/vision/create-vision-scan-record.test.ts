// F10-03 (VIAO_ROADMAP.md) — Tests de creación de vision_scans contra
// Supabase local real. `createVisionScanRecord` solo usa
// `createServiceRoleClient()` (sin `next/headers`), plenamente
// ejercitable aquí — mismo patrón que
// lib/rewards/create-reward-transaction.test.ts (F7-01).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createVisionScanRecord } from "./create-vision-scan-record";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1003-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1003-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("createVisionScanRecord: crea la fila con image_retained=false por defecto y los datos reales del resultado", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      sourceLanguage: "en",
      targetLanguage: "es",
      translatedText: "Hola mundo",
      explanation: "Un saludo común.",
    });
    assert.ok(scanId);

    const { data, error } = await authedClient
      .from("vision_scans")
      .select("id, user_id, source_language, target_language, translated_text, explanation, image_retained, trip_id")
      .eq("id", scanId)
      .single();

    assert.equal(error, null);
    assert.equal(data.user_id, userId);
    assert.equal(data.source_language, "en");
    assert.equal(data.target_language, "es");
    assert.equal(data.translated_text, "Hola mundo");
    assert.equal(data.explanation, "Un saludo común.");
    assert.equal(data.image_retained, false);
    assert.equal(data.trip_id, null);
  } finally {
    await deleteTestUser(userId);
  }
});

test("createVisionScanRecord: sourceLanguage/tripId ausentes se guardan como NULL (nunca inventados)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "",
      explanation: "No se detectó texto legible.",
    });

    const { data } = await authedClient
      .from("vision_scans")
      .select("source_language, trip_id")
      .eq("id", scanId)
      .single();
    assert.ok(data);
    assert.equal(data.source_language, null);
    assert.equal(data.trip_id, null);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── RLS: el propietario puede leer su escaneo, otro usuario no ──
test("un usuario autenticado puede leer su propio escaneo (vision_scans_select_own); otro usuario no lo ve", async () => {
  const owner = await signUpUser();
  const other = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId: owner.userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });

    const { data: ownData } = await owner.authedClient
      .from("vision_scans")
      .select("id")
      .eq("id", scanId);
    assert.equal(ownData?.length, 1);

    const { data: otherData } = await other.authedClient
      .from("vision_scans")
      .select("id")
      .eq("id", scanId);
    assert.equal(otherData?.length, 0, "un usuario ajeno no debe poder leer el escaneo de otro");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(other.userId);
  }
});

// ── RLS/GRANT: el cliente nunca puede insertar directamente ──
test("un usuario autenticado no puede insertar directamente en vision_scans (sin GRANT/policy de INSERT para el cliente)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error } = await authedClient.from("vision_scans").insert({
      user_id: userId,
      target_language: "es",
    });
    assert.ok(error, "se esperaba que el insert directo del cliente fuera rechazado");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un usuario autenticado no puede hacer UPDATE en vision_scans (image_retained solo se sincroniza vía trigger)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });

    const { error } = await authedClient
      .from("vision_scans")
      .update({ image_retained: true })
      .eq("id", scanId);
    assert.ok(error, "se esperaba que el UPDATE del cliente fuera rechazado");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un cliente anon no puede leer ni insertar en vision_scans", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error: selectError } = await anonClient.from("vision_scans").select("id").limit(1);
  assert.ok(selectError);

  const { error: insertError } = await anonClient
    .from("vision_scans")
    .insert({ user_id: "00000000-0000-0000-0000-000000000000", target_language: "es" });
  assert.ok(insertError);
});
