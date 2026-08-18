// F9 (VIAO_ROADMAP.md) — Auditoría estática: "ÚNICA puerta de entrada a
// OpenAI" no es solo una intención de diseño, se comprueba aquí contra el
// código fuente real (mismo estilo que
// app/booking/actions.test.ts, F6-02, para "no lee userId del cliente").
//
// Reglas comprobadas:
// - Solo lib/openai/client.ts construye un cliente (`new OpenAI(`).
// - Solo lib/openai/client.ts, lib/openai/index.ts y lib/openai/vision.ts
//   (F10-02) importan el paquete "openai" (index.ts/vision.ts únicamente
//   para el tipo de error `APIError`, no para construir un cliente).
// - Ningún Client Component ("use client") importa "openai".
// - Ninguna Server Action (app/**/actions.ts) importa "openai"
//   directamente — todas deben pasar por lib/openai/.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function relative(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

test("único cliente OpenAI: solo lib/openai/client.ts construye `new OpenAI(`", () => {
  const files = walk(path.join(ROOT, "app")).concat(walk(path.join(ROOT, "lib")));
  const offenders: string[] = [];

  for (const file of files) {
    const rel = relative(file);
    if (rel === "lib/openai/client.ts") continue;
    const source = readFileSync(file, "utf-8");
    if (/new\s+OpenAI\s*\(/.test(source)) {
      offenders.push(rel);
    }
  }

  assert.deepEqual(offenders, [], `archivos que construyen un cliente OpenAI fuera de lib/openai/client.ts: ${offenders.join(", ")}`);
});

test('único punto de importación: solo lib/openai/client.ts, lib/openai/index.ts y lib/openai/vision.ts importan el paquete "openai"', () => {
  const files = walk(path.join(ROOT, "app")).concat(walk(path.join(ROOT, "lib")));
  const allowed = new Set([
    "lib/openai/client.ts",
    "lib/openai/index.ts",
    "lib/openai/vision.ts",
  ]);
  const offenders: string[] = [];

  for (const file of files) {
    const rel = relative(file);
    if (allowed.has(rel)) continue;
    const source = readFileSync(file, "utf-8");
    if (/from ["']openai["']/.test(source)) {
      offenders.push(rel);
    }
  }

  assert.deepEqual(offenders, [], `archivos que importan "openai" fuera de lib/openai/: ${offenders.join(", ")}`);
});

test("ningún Client Component (\"use client\") importa el paquete \"openai\"", () => {
  const files = walk(path.join(ROOT, "app")).concat(walk(path.join(ROOT, "lib")));
  const offenders: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    if (/^"use client";/.test(source) && /from ["']openai["']/.test(source)) {
      offenders.push(relative(file));
    }
  }

  assert.deepEqual(offenders, []);
});

test("ninguna Server Action (app/**/actions.ts) importa \"openai\" directamente", () => {
  const files = walk(path.join(ROOT, "app")).filter((file) =>
    relative(file).endsWith("actions.ts"),
  );
  const offenders: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    if (/from ["']openai["']/.test(source)) {
      offenders.push(relative(file));
    }
  }

  assert.deepEqual(offenders, []);
});

test("OPENAI_API_KEY no aparece hardcodeada en ningún archivo fuente (solo process.env)", () => {
  const files = walk(path.join(ROOT, "app")).concat(walk(path.join(ROOT, "lib")));
  const offenders: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    // Busca asignaciones tipo apiKey: "sk-..." (clave real, no la lectura de env).
    if (/apiKey:\s*["']sk-/.test(source)) {
      offenders.push(relative(file));
    }
  }

  assert.deepEqual(offenders, []);
});
