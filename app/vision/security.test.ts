// F10 (VIAO_ROADMAP.md) — Tests de seguridad/ownership entre dos usuarios
// reales sobre `photos` (guardado desde Vision) y `vision_consents`
// (retirada), contra Supabase local real. Complementa
// lib/vision/delete-vision-scan.test.ts (ownership sobre vision_scans) y
// lib/vision/check-vision-consent.test.ts (ownership sobre lectura de
// vision_consents) — aquí se cubre específicamente lo que
// `withdrawVisionConsentAction`/el flujo de "guardar imagen" (F10-04)
// necesitan: que un usuario nunca pueda leer, guardar sobre, ni borrar
// `photos` ajenas, y que insertar un evento de consentimiento a nombre de
// otro usuario sea imposible — usando los mismos clientes reales
// (`@supabase/supabase-js`, `signUp()`) que el resto de la Fase 10/9/8/7,
// no un mock.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../../lib/supabase/service";
import { createVisionScanRecord } from "../../lib/vision/create-vision-scan-record";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f10sec-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f10sec-test-password-12345",
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
  return output.split("\n")[0].trim();
}

// ── Caso 6 (E2E): un usuario no puede acceder/eliminar la photo de otro ──
test("un usuario NO puede leer la photo de otro usuario (RLS photos_select_own)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const tripId = createTripAsSuperuser(owner.userId);
    const { data: photo, error } = await owner.authedClient
      .from("photos")
      .insert({ user_id: owner.userId, trip_id: tripId, storage_path: `${owner.userId}/sec-test.jpg` })
      .select()
      .single();
    assert.equal(error, null);

    const { data, error: readError } = await attacker.authedClient
      .from("photos")
      .select("id")
      .eq("id", photo.id);
    assert.equal(readError, null);
    assert.equal(data!.length, 0, "un usuario ajeno no debe poder leer la photo de otro");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("un usuario NO puede eliminar la photo de otro usuario (RLS photos_delete_own)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const tripId = createTripAsSuperuser(owner.userId);
    const { data: photo } = await owner.authedClient
      .from("photos")
      .insert({ user_id: owner.userId, trip_id: tripId, storage_path: `${owner.userId}/sec-test-2.jpg` })
      .select()
      .single();
    assert.ok(photo);

    await attacker.authedClient.from("photos").delete().eq("id", photo.id);

    const { data: stillThere } = await owner.authedClient
      .from("photos")
      .select("id")
      .eq("id", photo.id);
    assert.equal(stillThere?.length, 1, "el intento de borrado ajeno no debe haber eliminado la photo real");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("un usuario NO puede insertar una photo a nombre de otro usuario (WITH CHECK user_id = auth.uid())", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const tripId = createTripAsSuperuser(owner.userId);
    const { error } = await attacker.authedClient
      .from("photos")
      .insert({ user_id: owner.userId, trip_id: tripId, storage_path: `${owner.userId}/spoofed.jpg` });
    assert.ok(error, "se esperaba que WITH CHECK rechazara un user_id distinto al propio del atacante");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

// ── Migración 20260818180000 (hallazgo de la revisión final de F10): un
// usuario NO puede insertar una photo PROPIA (su propio user_id, pasa la
// comprobación anterior) apuntando trip_id/vision_scan_id a recursos de
// OTRO usuario — verificado real: antes de esta migración, ambos inserts
// tenían éxito y el trigger de sincronización llegaba a marcar
// image_retained=true en el escaneo ajeno. ──
test("un usuario NO puede insertar su propia photo apuntando trip_id a un viaje ajeno", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const ownerTripId = createTripAsSuperuser(owner.userId);
    const { error } = await attacker.authedClient.from("photos").insert({
      user_id: attacker.userId,
      trip_id: ownerTripId,
      storage_path: `${attacker.userId}/spoof-trip.jpg`,
    });
    assert.ok(error, "se esperaba que el WITH CHECK endurecido rechazara un trip_id ajeno");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("un usuario NO puede insertar su propia photo apuntando vision_scan_id a un escaneo ajeno (evita forzar image_retained=true en datos de otro)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const scanId = await createVisionScanRecord({
      userId: owner.userId,
      targetLanguage: "es",
      translatedText: "secreto",
      explanation: "secreto",
    });
    const attackerTripId = createTripAsSuperuser(attacker.userId);

    const { error } = await attacker.authedClient.from("photos").insert({
      user_id: attacker.userId,
      trip_id: attackerTripId,
      vision_scan_id: scanId,
      storage_path: `${attacker.userId}/spoof-scan.jpg`,
    });
    assert.ok(error, "se esperaba que el WITH CHECK endurecido rechazara un vision_scan_id ajeno");

    const { data: scanAfter } = await createServiceRoleClient()
      .from("vision_scans")
      .select("image_retained")
      .eq("id", scanId)
      .single();
    assert.equal(scanAfter?.image_retained, false, "el escaneo ajeno no debe haberse marcado como retenido");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("un usuario SÍ puede guardar su propia photo con su propio trip_id y su propio vision_scan_id (el endurecimiento no rompe el camino legítimo)", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const tripId = createTripAsSuperuser(userId);
    const scanId = await createVisionScanRecord({
      userId,
      targetLanguage: "es",
      translatedText: "texto",
      explanation: "explicación",
    });

    const { data, error } = await authedClient
      .from("photos")
      .insert({ user_id: userId, trip_id: tripId, vision_scan_id: scanId, storage_path: `${userId}/legit.jpg` })
      .select()
      .single();
    assert.equal(error, null, `insert legítimo falló: ${error?.message}`);
    assert.ok(data);

    const { data: scanAfter } = await authedClient
      .from("vision_scans")
      .select("image_retained")
      .eq("id", scanId)
      .single();
    assert.equal(scanAfter?.image_retained, true, "el trigger debe seguir sincronizando image_retained en el camino legítimo");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Caso 6 (E2E): un usuario no puede "retirar consentimiento" a nombre de otro ──
test("un usuario NO puede insertar un evento de consentimiento (granted o withdrawn) a nombre de otro usuario", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const { error: withdrawError } = await attacker.authedClient
      .from("vision_consents")
      .insert({ user_id: owner.userId, action: "withdrawn" });
    assert.ok(withdrawError, "se esperaba que WITH CHECK rechazara retirar el consentimiento de otro usuario");

    const { error: grantError } = await attacker.authedClient
      .from("vision_consents")
      .insert({ user_id: owner.userId, action: "granted" });
    assert.ok(grantError, "se esperaba que WITH CHECK rechazara conceder consentimiento a nombre de otro usuario");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

// ── Storage: un usuario no puede leer el archivo de otro en el bucket photos ──
test("un usuario NO puede leer el archivo Storage de otro en el bucket photos (RLS photos_select_own de storage.objects)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const path = `${owner.userId}/sec-storage-test.jpg`;
    const { error: uploadError } = await owner.authedClient.storage
      .from("photos")
      .upload(path, new Uint8Array([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" });
    assert.equal(uploadError, null, `upload falló: ${uploadError?.message}`);

    const { data: list, error: listError } = await attacker.authedClient.storage
      .from("photos")
      .list(owner.userId);
    assert.equal(listError, null);
    assert.equal(list?.length ?? 0, 0, "un usuario ajeno no debe poder listar los archivos de otro en el bucket photos");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});
