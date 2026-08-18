// F13-01 (VIAO_ROADMAP.md) — Suite centralizada de RLS contra Supabase
// local real. Complementa (no sustituye) los tests de RLS ya existentes
// por fase — este archivo verifica, en un único lugar, que CADA tabla se
// comporta según el Patrón A/B documentado en VIAO_DATABASE.md, con dos
// usuarios reales (A, B) y un tercero (E) para aislar `referrals` (donde
// B es legítimamente participante de UNA relación pero no de otra).
//
// Auditado contra Postgres real (no solo migraciones) antes de escribir
// este archivo: `\dp` para GRANTs, `pg_policies` para políticas, ver el
// reporte de F13 para la evidencia completa tabla por tabla.
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "../bookings/create-booking-record";
import { createRewardTransaction } from "../rewards/create-reward-transaction";
import { completeReferralActionIfPending } from "../referrals/complete-referral-action";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(tag: string, referralCode?: string) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const client = createClient(supabaseUrl, anonKey);

  const email = `f1301-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({
    email,
    password: "f1301-test-password-12345",
    ...(referralCode ? { options: { data: { referral_code: referralCode } } } : {}),
  });
  assert.equal(error, null, `signUp(${tag}) falló: ${error?.message}`);
  assert.ok(data.session);

  return { client, userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

interface Fixture {
  A: { client: SupabaseClient; userId: string };
  B: { client: SupabaseClient; userId: string };
  E: { client: SupabaseClient; userId: string };
  tripA: { id: string };
  bookingAId: string;
  searchA: { id: string };
  scanA: { id: string };
  photoA: { id: string };
  referralAB: { id: string };
  referralAE: { id: string };
  propertyRowId: string;
}

async function buildFixture(): Promise<Fixture> {
  const service = createServiceRoleClient();

  const A = await signUpUser("userA");
  const { data: aProfile } = await A.client.from("profiles").select("referral_code").eq("id", A.userId).single();
  assert.ok(aProfile);
  const B = await signUpUser("userB", aProfile.referral_code as string);
  const E = await signUpUser("userE", aProfile.referral_code as string);

  const { data: tripA } = await A.client
    .from("trips")
    .insert({ user_id: A.userId, destination: "F13-01 suite" })
    .select()
    .single();
  assert.ok(tripA);

  const propertyRowId = await upsertPropertyCache({
    providerName: "f1301_provider",
    providerPropertyId: `f1301-prop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "F13-01 Test Hotel",
    city: "Madrid",
    country: "España",
  });
  const bookingAId = await createBookingRecord({
    userId: A.userId,
    propertyRowId,
    checkIn: "2026-12-10",
    checkOut: "2026-12-12",
    guests: 2,
    providerBookingReference: `f1301-book-${Date.now()}`,
  });
  await service.from("bookings").update({ trip_id: tripA.id, status: "confirmed" }).eq("id", bookingAId);

  const { data: searchA } = await A.client
    .from("searches")
    .insert({ user_id: A.userId, destination: "Madrid", check_in: "2026-12-10", check_out: "2026-12-12", guests: 2, rooms: 1 })
    .select()
    .single();
  assert.ok(searchA);

  const { data: scanA } = await service
    .from("vision_scans")
    .insert({ user_id: A.userId, trip_id: tripA.id, target_language: "en" })
    .select()
    .single();
  assert.ok(scanA);

  const storagePathA = `${A.userId}/f1301-photo.jpg`;
  await A.client.storage.from("photos").upload(storagePathA, new Uint8Array([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" });
  const { data: photoA } = await A.client
    .from("photos")
    .insert({ user_id: A.userId, trip_id: tripA.id, storage_path: storagePathA })
    .select()
    .single();
  assert.ok(photoA);

  await createRewardTransaction({ userId: A.userId, amount: 50, reason: "booking", referenceType: "booking", referenceId: bookingAId });

  await completeReferralActionIfPending(B.userId);
  const { data: referralAB } = await service
    .from("referrals")
    .select("id")
    .eq("referrer_id", A.userId)
    .eq("referred_id", B.userId)
    .single();
  assert.ok(referralAB);
  const { data: referralAE } = await service
    .from("referrals")
    .select("id")
    .eq("referrer_id", A.userId)
    .eq("referred_id", E.userId)
    .single();
  assert.ok(referralAE);

  return { A, B, E, tripA, bookingAId, searchA, scanA, photoA, referralAB, referralAE, propertyRowId };
}

async function teardownFixture(fx: Fixture) {
  await deleteTestUser(fx.A.userId);
  await deleteTestUser(fx.B.userId);
  await deleteTestUser(fx.E.userId);
}

test("F13-01 RLS suite: matriz completa de aislamiento cross-user (A vs B) sobre las 13 tablas/vistas", async () => {
  const fx = await buildFixture();
  try {
    const { A, B, tripA, bookingAId, searchA, scanA, photoA, referralAB, referralAE, propertyRowId } = fx;

    // trips (Patrón A)
    assert.equal((await B.client.from("trips").select("*").eq("id", tripA.id)).data?.length, 0);
    assert.equal((await B.client.from("trips").update({ destination: "x" }).eq("id", tripA.id).select()).data?.length, 0);
    assert.equal((await B.client.from("trips").delete().eq("id", tripA.id).select()).data?.length, 0);
    assert.ok((await B.client.from("trips").insert({ user_id: A.userId, destination: "forged" })).error);

    // searches (Patrón A, sin modificación)
    assert.equal((await B.client.from("searches").select("*").eq("id", searchA.id)).data?.length, 0);
    assert.ok(
      (await B.client.from("searches").insert({ user_id: A.userId, destination: "x", check_in: "2026-12-01", check_out: "2026-12-02", guests: 1, rooms: 1 })).error,
    );

    // bookings (Patrón B)
    assert.equal((await B.client.from("bookings").select("*").eq("id", bookingAId)).data?.length, 0);
    assert.ok((await B.client.from("bookings").insert({ user_id: A.userId, property_id: propertyRowId, check_in: "2026-12-01", check_out: "2026-12-02", guests: 1 })).error);

    // photos (Patrón A, con harden F10/F11)
    assert.equal((await B.client.from("photos").select("*").eq("id", photoA.id)).data?.length, 0);
    assert.equal((await B.client.from("photos").update({ caption: "x" }).eq("id", photoA.id).select()).data?.length, 0);
    assert.equal((await B.client.from("photos").delete().eq("id", photoA.id).select()).data?.length, 0);
    assert.equal((await B.client.storage.from("photos").list(A.userId)).data?.length, 0);
    assert.ok((await B.client.storage.from("photos").download(`${A.userId}/f1301-photo.jpg`)).error);
    // F13-07: fix de path manipulado en photos_insert_own
    assert.ok((await B.client.storage.from("photos").upload(`${A.userId}/injected.jpg`, new Uint8Array([1]), { contentType: "image/jpeg" })).error);

    // vision_scans (Patrón B)
    assert.equal((await B.client.from("vision_scans").select("*").eq("id", scanA.id)).data?.length, 0);
    assert.ok((await B.client.from("vision_scans").insert({ user_id: A.userId, target_language: "en" })).error);

    // vision_consents (Patrón A-like, log inmutable)
    assert.equal((await B.client.from("vision_consents").select("*").eq("user_id", A.userId)).data?.length, 0);
    assert.ok((await B.client.from("vision_consents").insert({ user_id: A.userId, action: "granted" })).error);

    // rewards_transactions / rewards_wallets (Patrón B)
    assert.equal((await B.client.from("rewards_transactions").select("*").eq("user_id", A.userId)).data?.length, 0);
    assert.equal((await B.client.from("rewards_wallets").select("*").eq("user_id", A.userId)).data?.length, 0);

    // referrals (Patrón B): B participa en A-B (correcto que lo lea), NO participa en A-E
    assert.equal((await B.client.from("referrals").select("*").eq("id", referralAB.id)).data?.length, 1);
    assert.equal((await B.client.from("referrals").select("*").eq("id", referralAE.id)).data?.length, 0);
    // `referrals` no concede NINGÚN GRANT de UPDATE a `authenticated` (Patrón
    // B, "nadie desde el cliente") — a diferencia de `trips`/`profiles`
    // (donde SÍ hay GRANT y RLS filtra filas), aquí el UPDATE se rechaza en
    // el propio GRANT, antes de que RLS entre en juego: error, no data=[].
    assert.ok((await B.client.from("referrals").update({ status: "rewarded" }).eq("id", referralAE.id)).error);

    // analytics_events (Patrón B, sin lectura para nadie salvo backend)
    assert.ok((await B.client.from("analytics_events").insert({ event_name: "reward_earned", user_id: A.userId, metadata: {} })).error);
    assert.ok((await B.client.from("analytics_events").select("*").eq("user_id", A.userId)).error);

    // ai_rate_limit_events (Patrón B, sin lectura para nadie salvo backend)
    assert.ok((await B.client.from("ai_rate_limit_events").select("*").eq("user_id", A.userId)).error);

    // profiles
    assert.equal((await B.client.from("profiles").select("*").eq("id", A.userId)).data?.length, 0);
    assert.equal((await B.client.from("profiles").update({ name: "x" }).eq("id", A.userId).select()).data?.length, 0);
    assert.ok((await B.client.from("profiles").insert({ id: "11111111-2222-3333-4444-555555555555", referral_code: "FAKEFAKE12" })).error);

    // properties (catálogo compartido: lectura SÍ, escritura NO)
    assert.equal((await B.client.from("properties").select("*").eq("id", propertyRowId)).data?.length, 1);
    assert.ok((await B.client.from("properties").update({ name: "hacked" }).eq("id", propertyRowId)).error);

    // Verificación final: recursos de A intactos tras toda la matriz
    assert.equal((await A.client.from("trips").select("destination").eq("id", tripA.id).single()).data?.destination, "F13-01 suite");
    assert.equal((await A.client.from("photos").select("caption").eq("id", photoA.id).single()).data?.caption, null);
  } finally {
    await teardownFixture(fx);
  }
});

test("F13-01 RLS suite: anon no puede acceder a ninguna tabla con datos de usuario", async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(supabaseUrl, anonKey);

  const userScopedTables = [
    "trips",
    "bookings",
    "photos",
    "vision_scans",
    "vision_consents",
    "rewards_transactions",
    "rewards_wallets",
    "referrals",
    "profiles",
    "analytics_events",
    "ai_rate_limit_events",
  ];

  for (const table of userScopedTables) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    const blocked = Boolean(error) || (data?.length ?? 0) === 0;
    assert.ok(blocked, `anon no debe poder leer datos de "${table}"`);
  }

  // searches: anon no tiene GRANT en absoluto (a diferencia de trips/photos, donde authenticated sí puede leer lo propio)
  const { error: searchesInsertError } = await anon
    .from("searches")
    .insert({ user_id: "11111111-2222-3333-4444-555555555555", destination: "x", check_in: "2026-01-01", check_out: "2026-01-02", guests: 1, rooms: 1 });
  assert.ok(searchesInsertError, "anon no debe poder insertar en searches");

  // properties: única tabla de lectura abierta, pero solo para `authenticated`
  // (GRANT explícito), nunca `anon` (sin GRANT alguno -> error, no data=[]).
  const { error: anonPropertiesError } = await anon.from("properties").select("*").limit(1);
  assert.ok(anonPropertiesError, "anon no debe poder leer properties (solo authenticated)");
});
