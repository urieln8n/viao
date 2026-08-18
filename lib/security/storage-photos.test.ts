// F13-07 (VIAO_ROADMAP.md) — Test permanente de la vulnerabilidad real
// encontrada y corregida durante la auditoría de seguridad de Fase 13:
// la política `photos_insert_own` de `storage.objects`
// (supabase/migrations/20260817170000_create_storage_policies.sql, F1-10)
// solo comprobaba `owner_id = auth.uid()` — Supabase Storage asigna ese
// valor automáticamente al usuario que sube el archivo, así que la
// comprobación era siempre cierta para CUALQUIER subida propia del
// atacante, sin importar la ruta (`name`) del objeto. Un usuario B podía
// subir un archivo con `name = '<uid_de_A>/archivo.jpg'` — dentro de lo
// que aparenta ser la carpeta de A.
//
// Corregido en
// supabase/migrations/20260819100000_harden_photos_storage_insert_path.sql
// añadiendo la misma comprobación de prefijo de ruta que ya usaba
// `vision_scans_select_own` (`(storage.foldername(name))[1] = auth.uid()`)
// como condición ADICIONAL a `owner_id = auth.uid()`.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1307-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1307-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string, authedClient: anonClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

test("F13-07: un usuario B NO puede subir un archivo dentro de la carpeta de Storage de otro usuario A (path manipulado)", async () => {
  const owner = await signUpUser();
  const attacker = await signUpUser();
  try {
    const { error: forgedUploadError } = await attacker.authedClient.storage
      .from("photos")
      .upload(`${owner.userId}/injected-by-attacker.jpg`, new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      });
    assert.ok(
      forgedUploadError,
      "se esperaba que Storage rechazara la subida: la ruta pertenece a la carpeta de otro usuario",
    );
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(attacker.userId);
  }
});

test("F13-07: el flujo legítimo (subir dentro de la PROPIA carpeta del usuario autenticado) sigue funcionando tras el endurecimiento", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error: legitUploadError } = await authedClient.storage
      .from("photos")
      .upload(`${userId}/legit-photo.jpg`, new Uint8Array([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" });
    assert.equal(legitUploadError, null, "la subida legítima a la propia carpeta no debe verse afectada");
  } finally {
    await deleteTestUser(userId);
  }
});

test("F13-07: un usuario NO puede subir un archivo en la RAÍZ del bucket (sin prefijo de carpeta) ni con un prefijo que no sea su propio uid", async () => {
  const { userId, authedClient } = await signUpUser();
  try {
    const { error: rootUploadError } = await authedClient.storage
      .from("photos")
      .upload(`root-no-folder-${Date.now()}.jpg`, new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" });
    assert.ok(rootUploadError, "una subida sin carpeta de usuario no debe aceptarse");

    const { error: fakeUidUploadError } = await authedClient.storage
      .from("photos")
      .upload(`11111111-2222-3333-4444-555555555555/fake.jpg`, new Uint8Array([1, 2, 3]), {
        contentType: "image/jpeg",
      });
    assert.ok(fakeUidUploadError, "una subida con un prefijo de uid inventado (que no es el propio) no debe aceptarse");
  } finally {
    await deleteTestUser(userId);
  }
});
