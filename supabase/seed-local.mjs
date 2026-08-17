// F1-07 — Seed mínimo de datos de prueba (profiles + properties).
//
// Alcance deliberadamente mínimo, según docs/VIAO_ROADMAP.md (F1-07) y
// docs/VIAO_ARCHITECTURE.md sección 29: solo perfiles y propiedades
// ficticias, sin depender de un proveedor real. No siembra ninguna otra
// tabla (trips, searches, bookings, rewards_transactions, referrals,
// vision_scans, photos, analytics_events quedan vacías).
//
// Uso: contra el Supabase LOCAL únicamente.
//   npx supabase start
//   npx supabase db reset   (recrea el esquema, RLS incluido)
//   node supabase/seed-local.mjs
//
// Mecanismo:
// - Los 2 usuarios Auth de prueba se crean con el Admin API de Supabase
//   (auth.admin.createUser), usando la SERVICE_ROLE_KEY que se obtiene en
//   tiempo de ejecución de `supabase status -o json` (CLI local ya en
//   marcha) — nunca hardcodeada ni leída de .env.local.
// - Las filas de `profiles`/`properties` se insertan vía `psql` como rol
//   `postgres` dentro del contenedor local `supabase_db_VIAO` (mismo
//   patrón ya usado para datos de prueba en F1-03/F1-05/F1-06). Motivo:
//   `service_role` actualmente no tiene privilegios GRANT base (SELECT/
//   INSERT/UPDATE/DELETE) en ninguna tabla de public — BYPASSRLS solo
//   salta las políticas de RLS, no el sistema de GRANT de Postgres. Ese
//   vacío es más amplio que F1-07 (afectará a futuras Server Actions con
//   service_role) y queda señalado para resolverse aparte, antes de
//   F3-02/F6-02/F7-01 — no se toca ninguna migración aquí.
//
// Idempotente: puede volver a ejecutarse sobre una base ya sembrada sin
// duplicar usuarios/perfiles/propiedades (reutiliza por email / upsert).

import { execSync, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DB_CONTAINER = "supabase_db_VIAO";

function getLocalSupabaseCredentials() {
  const raw = execSync("npx --yes supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(raw);
  if (!status.API_URL || !status.SERVICE_ROLE_KEY) {
    throw new Error(
      "No se pudo obtener API_URL/SERVICE_ROLE_KEY de 'supabase status'. " +
        "¿Está el stack local levantado con 'npx supabase start'?",
    );
  }
  // Salvaguarda: el stack local siempre expone la API en 127.0.0.1/localhost.
  // Si esto no fuera así, nos negamos a continuar para no escribir jamás
  // contra un proyecto remoto por error.
  if (!/^(https?:\/\/)?(127\.0\.0\.1|localhost)/.test(status.API_URL)) {
    throw new Error(
      `API_URL no parece local (${status.API_URL}). Abortando por seguridad.`,
    );
  }
  return { url: status.API_URL, serviceRoleKey: status.SERVICE_ROLE_KEY };
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(sql) {
  return execFileSync(
    "docker",
    ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

const { url, serviceRoleKey } = getLocalSupabaseCredentials();
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Contraseña generada dinámicamente en cada ejecución (no hardcodeada): solo
// se usa una vez, en el momento de crear el usuario Auth de prueba en el
// Postgres efímero de Docker; este script nunca vuelve a iniciar sesión con
// ella, así que no hace falta que sea estable entre ejecuciones.
function generateSeedPassword() {
  return `Seed-${randomBytes(18).toString("hex")}-Aa1!`;
}

const SEED_USERS = [
  { email: "seed.a@viao.local.test", referralCode: "SEEDUSERA01", name: "Seed User A" },
  { email: "seed.b@viao.local.test", referralCode: "SEEDUSERB01", name: "Seed User B" },
];

const SEED_PROPERTIES = [
  {
    provider_name: "mock_seed",
    provider_property_id: "seed-property-001",
    name: "VIAO Seed Property 1",
    city: "Madrid",
    country: "España",
  },
  {
    provider_name: "mock_seed",
    provider_property_id: "seed-property-002",
    name: "VIAO Seed Property 2",
    city: "Lisboa",
    country: "Portugal",
  },
];

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureSeedUser({ email, referralCode, name }) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: generateSeedPassword(),
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`AUTH_USER_CREATED: ${email} (${user.id})`);
  } else {
    console.log(`AUTH_USER_EXISTS: ${email} (${user.id})`);
  }

  runSql(`
    insert into public.profiles (id, name, referral_code)
    values (${sqlLiteral(user.id)}, ${sqlLiteral(name)}, ${sqlLiteral(referralCode)})
    on conflict (id) do update
      set name = excluded.name,
          referral_code = excluded.referral_code;
  `);
  console.log(`PROFILE_UPSERTED: ${email} -> referral_code=${referralCode}`);

  return user.id;
}

function ensureSeedProperty(property) {
  runSql(`
    insert into public.properties (provider_name, provider_property_id, name, city, country)
    values (
      ${sqlLiteral(property.provider_name)},
      ${sqlLiteral(property.provider_property_id)},
      ${sqlLiteral(property.name)},
      ${sqlLiteral(property.city)},
      ${sqlLiteral(property.country)}
    )
    on conflict (provider_name, provider_property_id) do update
      set name = excluded.name,
          city = excluded.city,
          country = excluded.country;
  `);
  console.log(`PROPERTY_UPSERTED: ${property.provider_name}/${property.provider_property_id}`);
}

for (const user of SEED_USERS) {
  await ensureSeedUser(user);
}

for (const property of SEED_PROPERTIES) {
  ensureSeedProperty(property);
}

console.log("SEED_LOCAL: OK");
