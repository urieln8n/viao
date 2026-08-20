#!/usr/bin/env node
// FASE 1 — Sync Content API: runner MANUAL (deliberadamente no un cron,
// ver lib/hotelbeds/sync-content.ts) de syncHotelbedsContent(). Mismo
// patrón de compilación que scripts/run-tests.mjs (tsc a CommonJS en
// dist/, ejecutar con el runner nativo de Node) — pero, a diferencia de
// ese script, ESTE sí necesita credenciales reales de Hotelbeds/Supabase,
// así que carga `.env.local` explícitamente con `process.loadEnvFile()`
// (nativo de Node, sin dependencia nueva). Ninguna librería bajo lib/
// hace esto por sí misma: siguen leyendo `process.env` tal cual, sin
// saber de dónde vinieron los valores — la carga de `.env.local` vive
// únicamente aquí, en el runner manual.
//
// Uso: node scripts/sync-hotelbeds-content.mjs
// Requiere (en el entorno, o en .env.local): HOTELBEDS_API_KEY,
// HOTELBEDS_SECRET, HOTELBEDS_BASE_URL, HOTELBEDS_FIXED_HOTEL_CODES,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { execFileSync } from "node:child_process";
import { rmSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = process.cwd();

const envLocalPath = path.join(ROOT, ".env.local");
if (existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath);
  console.log("[sync-hotelbeds-content] .env.local cargado.");
} else {
  console.log("[sync-hotelbeds-content] .env.local no encontrado — se usan las variables ya presentes en el entorno.");
}

const outDir = path.join(ROOT, "dist", "sync-hotelbeds-content");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tscBin = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
const entry = path.join(ROOT, "lib", "hotelbeds", "sync-content.ts");

console.log("[sync-hotelbeds-content] Compilando a CommonJS...");
try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      entry,
      "--module", "commonjs",
      "--target", "es2020",
      "--lib", "es2022,dom",
      "--esModuleInterop",
      "--strict",
      "--skipLibCheck",
      "--resolveJsonModule",
      "--outDir", outDir,
    ],
    { stdio: "inherit" },
  );
} catch {
  console.error("[sync-hotelbeds-content] Fallo de compilación TypeScript — ver arriba.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const { syncHotelbedsContent } = require(
  path.join(outDir, "lib", "hotelbeds", "sync-content.js"),
);

console.log("[sync-hotelbeds-content] Ejecutando el sync real (única petición Content API de esta ejecución)...");
const result = await syncHotelbedsContent();

console.log("\n[sync-hotelbeds-content] status:", result.status);

if (result.status === "success") {
  for (const row of result.results) {
    console.log("\n----------------------------------------");
    console.log("hotelCode:", row.hotelCode);
    console.log("properties.id:", row.propertyRowId);
    console.log("name:", row.property.name);
    console.log("city:", row.property.city);
    console.log("country:", row.property.country);
    console.log("latitude:", row.property.latitude);
    console.log("longitude:", row.property.longitude);
    console.log("mainPhotoUrl:", row.property.mainPhotoUrl);
  }
  console.log("\n[sync-hotelbeds-content] OK —", result.results.length, "hotel(es) sincronizado(s).");
  process.exit(0);
}

if (result.status === "hotel_missing_from_response") {
  console.error("[sync-hotelbeds-content] El hotel", result.hotelCode, "no vino en la respuesta del Content API — sync abortado (fail closed).");
} else if (result.status === "http_error") {
  console.error("[sync-hotelbeds-content] HTTP", result.httpStatus, JSON.stringify(result.body));
} else if (result.status === "network_error" || result.status === "missing_credentials") {
  console.error("[sync-hotelbeds-content]", result.message);
} else if (result.status === "no_hotel_codes_configured") {
  console.error("[sync-hotelbeds-content] HOTELBEDS_FIXED_HOTEL_CODES no está configurado o no contiene ningún código válido.");
}
process.exit(1);
