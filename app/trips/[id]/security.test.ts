// F11 (VIAO_ROADMAP.md) — Tests de seguridad/ownership entre dos usuarios
// reales sobre `trips`/`photos`/Storage, contra Supabase local real.
// Reproduce empíricamente los 5 vectores de ataque verificados en el
// E2E de la fase (Usuario B contra recursos de Usuario A): leer/
// modificar el viaje ajeno, leer/eliminar la foto ajena, listar el
// Storage ajeno — todos deben fallar. Complementa
// lib/trips/get-trip-by-id.test.ts (ownership de `trips`) y
// lib/bookings/associate-trip.test.ts (ownership de la asociación de
// reservas).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../../../lib/supabase/service";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f11sec-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f11sec-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("un usuario B no puede leer ni modificar el viaje de A; no puede leer, eliminar ni listar el Storage de una photo de A", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const { data: trip } = await owner.authedClient
      .from("trips")
      .insert({ user_id: owner.userId, destination: "Madrid" })
      .select()
      .single();
    assert.ok(trip);

    const storagePath = `${owner.userId}/security-test.jpg`;
    const { error: uploadError } = await owner.authedClient.storage
      .from("photos")
      .upload(storagePath, new Uint8Array([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" });
    assert.equal(uploadError, null);

    const { data: photo } = await owner.authedClient
      .from("photos")
      .insert({ user_id: owner.userId, trip_id: trip.id, storage_path: storagePath })
      .select()
      .single();
    assert.ok(photo);

    // 1. B lee el viaje de A
    const { data: readTrip, error: readTripError } = await attacker.authedClient
      .from("trips")
      .select("*")
      .eq("id", trip.id);
    assert.equal(readTripError, null);
    assert.equal(readTrip!.length, 0, "B no debe poder leer el viaje de A");

    // 2. B modifica el viaje de A
    const { data: updatedTrip } = await attacker.authedClient
      .from("trips")
      .update({ destination: "HACKED" })
      .eq("id", trip.id)
      .select();
    assert.equal(updatedTrip!.length, 0, "B no debe poder modificar el viaje de A");

    // 3. B lee la photo de A
    const { data: readPhoto, error: readPhotoError } = await attacker.authedClient
      .from("photos")
      .select("*")
      .eq("id", photo.id);
    assert.equal(readPhotoError, null);
    assert.equal(readPhoto!.length, 0, "B no debe poder leer la photo de A");

    // 4. B elimina la photo de A
    const { data: deletedPhoto } = await attacker.authedClient
      .from("photos")
      .delete()
      .eq("id", photo.id)
      .select();
    assert.equal(deletedPhoto!.length, 0, "B no debe poder eliminar la photo de A");

    // 5. B lista el Storage de A
    const { data: listed, error: listError } = await attacker.authedClient.storage
      .from("photos")
      .list(owner.userId);
    assert.equal(listError, null);
    assert.equal(listed!.length, 0, "B no debe poder listar el Storage de A");

    // Confirmar que los datos de A siguen intactos tras los 5 intentos
    const service = createServiceRoleClient();
    const { data: tripAfter } = await service.from("trips").select("destination").eq("id", trip.id).single();
    assert.equal(tripAfter?.destination, "Madrid", "el viaje de A no debe haberse modificado");
    const { data: photoAfter } = await owner.authedClient.from("photos").select("id").eq("id", photo.id);
    assert.equal(photoAfter?.length, 1, "la photo de A no debe haberse eliminado");
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});
