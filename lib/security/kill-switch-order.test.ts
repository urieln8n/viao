// F13-06 (VIAO_ROADMAP.md) — Verificación permanente del orden exacto de
// comprobaciones en los dos endpoints de coste variable (recomendación
// IA, Vision): el interruptor de emergencia debe comprobarse ANTES de
// consumir cupo de rate limit y ANTES de llamar a OpenAI — "como se
// corrigió en F9/F10" (hallazgo de las revisiones finales de esas fases:
// comprobar el kill switch solo dentro del wrapper de OpenAI significaba
// que, con la IA/Vision desactivada, una solicitud igualmente consumía
// cupo de rate limit antes de ser rechazada).
//
// Escaneo de texto fuente (mismo patrón ya establecido en
// app/booking/actions.test.ts para verificar orden de operaciones): no
// ejecuta la Server Action (depende de `next/headers`, no invocable fuera
// de una petición real), confirma que la comprobación del kill switch
// aparece ANTES, en el código fuente, que la del rate limit y que
// cualquier importación del wrapper de OpenAI.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// J-B8.1 (Travel Legacy Purge — Search & AI Recommendation) — se retira
// aquí el test que comprobaba isAiRecommendationsEnabled() en
// app/search/ai-recommendation/actions.ts: ese archivo (y toda la
// funcionalidad de recomendación IA sobre búsquedas) se elimina en este
// bloque. lib/openai/index.ts (el wrapper de OpenAI que exponía ese kill
// switch) permanece intacto y sigue verificado más abajo.

test("F13-06: app/vision/actions.ts comprueba isVisionEnabled() ANTES de checkAndConsumeRateLimit()", () => {
  const source = readSource("app/vision/actions.ts");
  const killSwitchIdx = source.indexOf("isVisionEnabled()");
  const rateLimitIdx = source.indexOf("checkAndConsumeRateLimit(");
  assert.ok(killSwitchIdx !== -1, "no se encontró la comprobación del kill switch");
  assert.ok(rateLimitIdx !== -1, "no se encontró la comprobación de rate limit");
  assert.ok(killSwitchIdx < rateLimitIdx, "el kill switch debe comprobarse ANTES del rate limit");
});

test("F13-06: app/vision/actions.ts comprueba isVisionEnabled() ANTES de validar/leer la imagen del cliente", () => {
  const source = readSource("app/vision/actions.ts");
  const killSwitchIdx = source.indexOf("isVisionEnabled()");
  // Bloque "Cámara como flujo principal de Vision" — el cliente ya no
  // envía el File original (`formData.get("image")`, provocaba "Body
  // exceeded 1 MB limit" en fotos de móvil reales): ahora sube el
  // archivo directamente a Storage y solo envía la ruta
  // (`formData.get("imagePath")`). Misma propiedad de seguridad que
  // antes: el kill switch debe comprobarse ANTES de tocar cualquier
  // referencia a la imagen enviada por el cliente.
  const imageReadIdx = source.indexOf('formData.get("imagePath")');
  assert.ok(killSwitchIdx !== -1 && imageReadIdx !== -1);
  assert.ok(killSwitchIdx < imageReadIdx, "el kill switch debe comprobarse ANTES de tocar la referencia de imagen enviada por el cliente");
});

test("F13-06: ambos wrappers de OpenAI (lib/openai/index.ts, lib/openai/vision.ts) comprueban su kill switch ANTES de construir el cliente de OpenAI (defensa en profundidad)", () => {
  // Se busca el SITIO DE LLAMADA real (`= getOpenAiClient()`), no la
  // cadena suelta "getOpenAiClient()" — ambos archivos la mencionan
  // también dentro de un comentario ANTES del código real, lo que daría
  // un falso positivo si se buscara la cadena sin más contexto.
  const recSource = readSource("lib/openai/index.ts");
  const recKillSwitchIdx = recSource.indexOf("isAiRecommendationsEnabled()");
  const recClientIdx = recSource.indexOf("= getOpenAiClient();");
  assert.ok(recKillSwitchIdx !== -1 && recClientIdx !== -1);
  assert.ok(recKillSwitchIdx < recClientIdx);

  const visionSource = readSource("lib/openai/vision.ts");
  const visionKillSwitchIdx = visionSource.indexOf("isVisionEnabled()");
  const visionClientIdx = visionSource.indexOf("= getOpenAiClient();");
  assert.ok(visionKillSwitchIdx !== -1 && visionClientIdx !== -1);
  assert.ok(visionKillSwitchIdx < visionClientIdx);
});
