import { createServiceRoleClient } from "../supabase/service";

// F10-03 (VIAO_ROADMAP.md) — Único punto que crea filas en `vision_scans`.
// VIAO_DATABASE.md sección 10: "Insertar: nadie desde el cliente — se
// crea en el backend tras el procesamiento server-side de OpenAI" —
// mismo Patrón B que analytics_events/rewards_transactions/
// ai_rate_limit_events, `service_role` con GRANT explícito (migración
// 20260818170000_setup_vision.sql, mismo vacío recurrente de
// F5-05/F6-02/F7-01/F8-04/F9-03).
//
// Ownership del `tripId` (hallazgo de la auditoría de seguridad de F13,
// misma clase que el de F10 sobre `photos_insert_own` y el de F11 sobre
// `associateBookingWithTrip`): `app/vision/actions.ts` solo valida el
// FORMATO de `tripId` (UUID), nunca que pertenezca al usuario — verificado
// empíricamente antes de esta corrección: llamando a esta función
// directamente con el `userId` de un atacante y el `tripId` real de otro
// usuario, el escaneo se creaba igualmente con `trip_id` apuntando al
// viaje ajeno. Aunque el harden de F10 sobre `photos_insert_own` ya impide
// que ese `trip_id` forjado se pueda aprovechar después para colar una
// foto en el viaje ajeno, la fila de `vision_scans` en sí quedaba con una
// relación falsa — se corrige aquí, en el punto más bajo posible: si
// `tripId` no existe o no pertenece a `userId`, se guarda como si no se
// hubiera proporcionado (`trip_id: null`), nunca un error — mismo
// criterio ya establecido para `search_id` en `app/booking/actions.ts`
// (F6-06: "ambos casos son indistinguibles a propósito... sin search_id,
// nunca una relación falsa"). No se descarta el resultado real ya
// obtenido de OpenAI por un `tripId` inválido/ajeno: el escaneo sigue
// registrándose con normalidad, solo sin esa asociación.
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

  let ownTripId: string | null = null;
  if (tripId) {
    const { data: trip } = await service
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    ownTripId = trip ? tripId : null;
  }

  const { data, error } = await service
    .from("vision_scans")
    .insert({
      user_id: userId,
      trip_id: ownTripId,
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
