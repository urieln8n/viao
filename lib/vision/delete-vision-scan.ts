import { createServiceRoleClient } from "../supabase/service";

// F10-04 (VIAO_ROADMAP.md) — "Eliminar: nadie directamente vía RLS — la
// eliminación se ejecuta mediante una Server Action que usa el rol de
// servicio tras validar que el solicitante es el propietario"
// (VIAO_DATABASE.md sección 10). Ownership NO se valida con una lectura
// previa aparte: el propio `.eq("user_id", userId)` en el DELETE ya
// garantiza que, si el escaneo no es del solicitante, la operación borra
// 0 filas (nunca un error, nunca borra el escaneo de otro) — mismo
// patrón que `checkAndConsumeRateLimit`/`createRewardTransaction`.
//
// El borrado del escaneo NUNCA borra una foto ya guardada a partir de él:
// `photos.vision_scan_id` es `ON DELETE SET NULL` (F1-06) — la foto
// guardada sobrevive de forma independiente, solo pierde el enlace al
// escaneo de origen. Retirar la foto en sí (si el usuario también lo
// desea) es una acción aparte sobre `photos`, no de este archivo.
export interface DeleteVisionScanResult {
  deleted: boolean;
}

export async function deleteVisionScan(
  scanId: string,
  userId: string,
): Promise<DeleteVisionScanResult> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("vision_scans")
    .delete()
    .eq("id", scanId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error(`No se pudo eliminar el escaneo: ${error.message}`);
  }

  return { deleted: Boolean(data && data.length > 0) };
}
