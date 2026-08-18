// F10-04 (VIAO_ROADMAP.md) — Tests de eliminación de un escaneo contra
// Supabase local real. `deleteVisionScan` solo usa
// `createServiceRoleClient()` (sin `next/headers`), plenamente
// ejercitable aquí.
//
// Fixture de `trips`: `service_role` NO tiene GRANT sobre `trips` (tabla
// sin ninguna escritura de aplicación todavía — "Crear viaje" es F11-01,
// Fase 11, ver el reporte de la fase para el detalle de este gap
// preexistente) — se crea directamente como superusuario de Postgres
// (`docker exec ... psql -U postgres`), mismo mecanismo ya usado en
// lib/referrals/referral-registration.test.ts (F8-05, Caso 7) para
// aislar una comprobación de la capa de GRANTs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { createVisionScanRecord } from "./create-vision-scan-record";
import { deleteVisionScan } from "./delete-vision-scan";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1004-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1004-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

function createTripAsSuperuser(userId: string): string {
  const output = execSync(
    `docker exec supabase_db_VIAO psql -U postgres -d postgres -t -A -c "insert into public.trips (user_id, destination) values ('${userId}', 'Test') returning id;"`,
  )
    .toString()
    .trim();
  // psql -t -A sigue imprimiendo una línea de estado ("INSERT 0 1") además
  // del valor devuelto por RETURNING en este entorno — solo la primera
  // línea es el uuid real.
  return output.split("\n")[0].trim();
}

test("deleteVisionScan: elimina el escaneo del propietario y devuelve deleted:true", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });

    const result = await deleteVisionScan(scanId, userId);
    assert.equal(result.deleted, true);

    const { data } = await authedClient.from("vision_scans").select("id").eq("id", scanId);
    assert.equal(data?.length, 0, "el escaneo ya no debe existir");
  } finally {
    await deleteTestUser(userId);
  }
});

test("deleteVisionScan: escaneo inexistente -> deleted:false, no lanza", async () => {
  const { userId } = await signUpUser();
  try {
    const result = await deleteVisionScan("11111111-2222-3333-4444-555555555555", userId);
    assert.equal(result.deleted, false);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Seguridad: un usuario no puede eliminar el escaneo de otro ──
test("deleteVisionScan: un usuario NO puede eliminar el escaneo de otro (deleted:false, el escaneo sigue existiendo)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId: owner.userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });

    const result = await deleteVisionScan(scanId, attacker.userId);
    assert.equal(result.deleted, false, "el intento de borrado ajeno no debe reportar éxito");

    const { data } = await owner.authedClient.from("vision_scans").select("id").eq("id", scanId);
    assert.equal(data?.length, 1, "el escaneo del propietario debe seguir existiendo intacto");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

// ── Política: borrar un escaneo NO borra la foto ya guardada a partir de él (solo desvincula) ──
test("deleteVisionScan: si el escaneo tiene una foto guardada, la foto sobrevive (vision_scan_id pasa a NULL, ON DELETE SET NULL)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });
    const tripId = createTripAsSuperuser(userId);

    const { data: photo, error: photoError } = await authedClient
      .from("photos")
      .insert({ user_id: userId, trip_id: tripId, vision_scan_id: scanId, storage_path: `${userId}/test-delete.jpg` })
      .select()
      .single();
    assert.equal(photoError, null, `insert de photos falló: ${photoError?.message}`);

    const result = await deleteVisionScan(scanId, userId);
    assert.equal(result.deleted, true);

    const { data: photoAfter } = await authedClient
      .from("photos")
      .select("id, vision_scan_id")
      .eq("id", photo.id)
      .single();
    assert.ok(photoAfter, "la foto debe seguir existiendo tras borrar el escaneo de origen");
    assert.equal(photoAfter.vision_scan_id, null, "vision_scan_id debe quedar NULL (ON DELETE SET NULL)");
  } finally {
    await deleteTestUser(userId);
  }
});

test("un cliente autenticado no puede eliminar directamente en vision_scans (sin GRANT/policy de DELETE para el cliente)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "Texto",
      explanation: "Explicación",
    });

    const { error } = await authedClient.from("vision_scans").delete().eq("id", scanId);
    assert.ok(error, "se esperaba que el DELETE directo del cliente fuera rechazado");
  } finally {
    await deleteTestUser(userId);
  }
});
