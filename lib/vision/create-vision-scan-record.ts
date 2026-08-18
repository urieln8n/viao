import { createServiceRoleClient } from "../supabase/service";

// F10-03 (VIAO_ROADMAP.md) — Único punto que crea filas en `vision_scans`.
// VIAO_DATABASE.md sección 10: "Insertar: nadie desde el cliente — se
// crea en el backend tras el procesamiento server-side de OpenAI" —
// mismo Patrón B que analytics_events/rewards_transactions/
// ai_rate_limit_events, `service_role` con GRANT explícito (migración
// 20260818170000_setup_vision.sql, mismo vacío recurrente de
// F5-05/F6-02/F7-01/F8-04/F9-03).
//
// `image_retained` NUNCA se pasa como parámetro: la tabla lo define
// `NOT NULL DEFAULT false` (VIAO_DATABASE.md sección 10) y la única forma
// real de que pase a `true` es el trigger `sync_vision_scan_image_retained`
// (F10-04) al guardar una foto — nunca esta función.
export interface CreateVisionScanRecordInput {
  userId: string;
  tripId?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  translatedText: string;
  explanation: string;
}

export async function createVisionScanRecord({
  userId,
  tripId,
  sourceLanguage,
  targetLanguage,
  translatedText,
  explanation,
}: CreateVisionScanRecordInput): Promise<string> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("vision_scans")
    .insert({
      user_id: userId,
      trip_id: tripId ?? null,
      source_language: sourceLanguage ?? null,
      target_language: targetLanguage,
      translated_text: translatedText,
      explanation,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo registrar el escaneo de Vision: ${error?.message ?? "sin datos"}`,
    );
  }
  return data.id as string;
}
