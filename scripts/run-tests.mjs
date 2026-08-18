#!/usr/bin/env node
// F14-05 (VIAO_ROADMAP.md) — "Inclusión de tests de RLS en la suite
// general": hasta ahora, cada fase compilaba y ejecutaba sus tests con un
// comando manual ad-hoc (documentado en cada reporte de fase, siempre el
// mismo patrón: descubrir *.test.ts bajo app/ y lib/, compilar a
// CommonJS con `tsc`, ejecutar con el runner nativo de Node). Este script
// FORMALIZA ese mismo patrón exacto en un único comando reproducible
// (`npm test`) — no introduce un framework de testing nuevo (Jest/Vitest
// siguen "sin fijar", VIAO_ARCHITECTURE.md sección 34), no cambia la
// arquitectura del proyecto, no añade dependencias nuevas (usa
// `typescript`, ya instalado, y `node:test`, nativo del runtime).
//
// Como `lib/security/rls-suite.test.ts` ya sigue la misma convención de
// nombre (`*.test.ts`) que el resto del proyecto, queda incluido
// automáticamente en el descubrimiento de archivos de este script — sin
// necesitar ninguna lista especial ni exclusión. Lo mismo aplica a
// cualquier test futuro: basta con nombrarlo `*.test.ts` bajo `app/` o
// `lib/` para que la suite lo recoja.
//
// Uso: `npm test` (ver package.json). Requiere que las variables de
// entorno de Supabase LOCAL ya estén exportadas en el proceso que invoca
// este script (nunca se lee `.env.local` aquí — mismo criterio de
// seguridad ya establecido en todo el proyecto: los tests contra
// Supabase real nunca deben apuntar accidentalmente a un proyecto
// remoto).
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);

function findTestFiles(dir) {
  let results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findTestFiles(full));
    } else if (entry.endsWith(".test.ts")) {
      results.push(full);
    }
  }
  return results;
}

const testFiles = [...findTestFiles(path.join(ROOT, "app")), ...findTestFiles(path.join(ROOT, "lib"))];

if (testFiles.length === 0) {
  console.error("No se encontró ningún archivo *.test.ts bajo app/ o lib/.");
  process.exit(1);
}

console.log(`[run-tests] ${testFiles.length} archivos de test descubiertos (app/ + lib/, *.test.ts).`);

const outDir = path.join(ROOT, "dist", "test-run");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Se invoca el binario de `tsc` y el propio ejecutable de Node por su
// ruta absoluta (`process.execPath`), nunca vía `npx`/shell — evita
// depender de la resolución de PATH del sistema (más fiable
// multiplataforma) y evita el aviso de Node sobre pasar argumentos con
// `shell: true` (los argumentos aquí son siempre rutas de archivo
// descubiertas por este mismo script, nunca entrada externa, pero se
// evita el patrón de todos modos).
const tscBin = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");

console.log("[run-tests] Compilando a CommonJS (mismo comando usado en cada fase del roadmap)...");
try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      ...testFiles,
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
  console.error("[run-tests] Fallo de compilación TypeScript — ver arriba.");
  process.exit(1);
}

console.log("[run-tests] Ejecutando la suite con node --test...");
try {
  execFileSync(
    process.execPath,
    ["--test", "--test-concurrency=1", `${outDir}/**/*.test.js`],
    { stdio: "inherit" },
  );
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
