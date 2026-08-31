"use server";

import { createClient as createSessionClient } from "../../lib/supabase/server";
import { hasActiveVisionConsent } from "../../lib/vision/check-vision-consent";
import { validateImage } from "../../lib/vision/validate-image";
import { createVisionScanRecord } from "../../lib/vision/create-vision-scan-record";
import { deleteVisionScan } from "../../lib/vision/delete-vision-scan";
import { checkAndConsumeRateLimit } from "../../lib/rate-limit/check-rate-limit";
import { VISION_SCAN_RATE_LIMIT_PROVISIONAL } from "../../lib/rate-limit/config";
import { isVisionEnabled } from "../../lib/openai/config";
import { generateVisionScan } from "../../lib/openai/vision";
import { logVisionOutcome } from "../../lib/openai/log";
import { isValidUuid } from "../../lib/utils/is-valid-uuid";
import { SUPPORTED_LOCALES, type Locale } from "../../lib/i18n/types";

// F10-00→F10-05 (VIAO_ROADMAP.md) — Server Actions de VIAO Vision.
//
// Orden de comprobaciones para `scanVisionAction` (F10-00: "el rechazo
// debe ocurrir antes de: OpenAI, rate-limit de Vision, procesamiento de
// imagen, persistencia de resultado"):
// 1. Autenticación (fail-closed, F3-06).
// 2. Kill switch (F10-05/lib/openai/config.ts) — igual que el hallazgo de
//    la revisión final de F9: comprobarlo aquí, antes de consentimiento/
//    rate-limit, evita gastar cualquier recurso cuando Vision está
//    desactivada por operación.
// 3. Consentimiento (F10-00) — releído server-side de `vision_consents`
//    (lib/vision/check-vision-consent.ts), NUNCA confiado desde el
//    cliente: `scanVisionAction` no acepta ningún parámetro de
//    consentimiento en absoluto.
// 4. Validación de imagen (F10-01) — primera barrera de coste real.
// 5. Rate limit (F10-05, `endpoint: "vision_scan"`, presupuesto
//    independiente del de recomendación IA).
// 6. `generateVisionScan()` (F10-02) — único punto de llamada al wrapper
//    de OpenAI para Vision; el kill switch se revuelve a comprobar dentro
//    (defensa en profundidad).
// 7. Persistencia en `vision_scans` (F10-03) — `image_retained=false` por
//    defecto: la fila de `vision_scans` en sí nunca guarda la imagen,
//    solo el resultado en texto.
//
// FASE J-B6 (Vision Decouple, 2026-08-27) — se retira el parseo de
// `tripId` del FormData: Vision ya no depende de Trips para escanear.
// `createVisionScanRecord()` (lib/vision/create-vision-scan-record.ts,
// NO modificado en este bloque) ya trataba `tripId` como parámetro
// opcional — al no recibirlo nunca, sigue insertando `trip_id: null` sin
// ningún cambio de comportamiento propio.
//
// Corrección de arquitectura (bloque "Cámara como flujo principal de
// Vision") — hallazgo real: esta Action recibía el `File` original
// dentro del FormData. Una Server Action de Next.js tiene un límite de
// tamaño de cuerpo (1 MB por defecto) muy por debajo de una foto de
// móvil real, así que cualquier captura de cámara medianamente grande
// hacía fallar la invocación de la Action ANTES de que este código
// llegara a ejecutarse ("Body exceeded 1 MB limit") — subir el límite de
// `serverActions.bodySizeLimit` habría escondido el síntoma sin
// solucionar el problema real: seguir enviando binarios grandes por un
// canal pensado para datos de formulario pequeños.
//
// Ahora el cliente sube el archivo DIRECTAMENTE a Storage (bucket
// `photos`, RLS `photos_insert_own` ya lo permite — mismo patrón que
// "Guardar imagen" ya usaba) ANTES de llamar a esta Action, y solo envía
// `imagePath` (una ruta de texto, unos pocos bytes). Aquí se descargan
// los bytes reales desde Storage con el cliente de sesión (una petición
// saliente normal server-to-Supabase, sin el límite de las Server
// Actions) para poder seguir ejecutando EXACTAMENTE la misma validación
// (`validateImage`, magic bytes reales, límite de 10 MB — ya vigente en
// `lib/vision/config.ts` antes de este bloque, nunca tocado) y la misma
// llamada a OpenAI (`generateVisionScan`, base64, sin cambios).
const ENDPOINT = "vision_scan";

export type ScanVisionActionResult =
  | {
      status: "success";
      scanId: string;
      sourceLanguage: string;
      translatedText: string;
      explanation: string;
    }
  | { status: "unauthenticated" }
  | { status: "vision_disabled" }
  | { status: "no_consent" }
  | { status: "invalid_image"; reason: string }
  | { status: "rate_limited"; limit: number }
  | { status: "provider_error"; message: string };

function parseTargetLanguage(raw: FormDataEntryValue | null): Locale {
  if (typeof raw === "string" && SUPPORTED_LOCALES.includes(raw as Locale)) {
    return raw as Locale;
  }
  return "es";
}

export async function scanVisionAction(
  formData: FormData,
): Promise<ScanVisionActionResult> {
  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return { status: "unauthenticated" };
  }

  if (!isVisionEnabled()) {
    await logVisionOutcome({ endpoint: ENDPOINT, outcome: "disabled" });
    return { status: "vision_disabled" };
  }

  const hasConsent = await hasActiveVisionConsent();
  if (!hasConsent) {
    await logVisionOutcome({ endpoint: ENDPOINT, outcome: "no_consent" });
    return { status: "no_consent" };
  }

  const rawImagePath = formData.get("imagePath");
  if (typeof rawImagePath !== "string" || !rawImagePath.startsWith(`${userId}/`)) {
    // El prefijo de carpeta debe ser el propio userId — misma
    // comprobación de defensa en profundidad que ya usa el resto del
    // proyecto para Storage (RLS ya lo exige al nivel de Postgres; esto
    // solo evita una descarga innecesaria si el valor viene manipulado).
    return { status: "invalid_image", reason: "invalid_mime_type" };
  }
  const imagePath = rawImagePath;

  // Segunda instancia del cliente de sesión: la de arriba queda fuera de
  // alcance al cerrarse su propio try/catch (patrón ya existente de esta
  // función, sin tocar). RLS (`photos_select_own`) sigue siendo quien
  // decide qué puede descargarse — la comprobación de prefijo de arriba
  // es solo una capa extra, no la que realmente protege esto.
  const sessionClient = await createSessionClient();
  const { data: downloadedFile, error: downloadError } = await sessionClient.storage
    .from("photos")
    .download(imagePath);
  if (downloadError || !downloadedFile) {
    return { status: "invalid_image", reason: "invalid_mime_type" };
  }

  const arrayBuffer = await downloadedFile.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mimeType = downloadedFile.type || "image/jpeg";
  const validation = validateImage({
    mimeType,
    sizeBytes: bytes.byteLength,
    bytes,
  });
  if (!validation.valid) {
    return { status: "invalid_image", reason: validation.reason };
  }

  const targetLanguage = parseTargetLanguage(formData.get("targetLanguage"));

  const rateLimit = await checkAndConsumeRateLimit({
    userId,
    endpoint: ENDPOINT,
    rule: VISION_SCAN_RATE_LIMIT_PROVISIONAL,
  });
  if (!rateLimit.allowed) {
    await logVisionOutcome({ endpoint: ENDPOINT, outcome: "rate_limited" });
    return { status: "rate_limited", limit: rateLimit.limit };
  }

  const imageBase64 = Buffer.from(bytes).toString("base64");
  const wrapperResult = await generateVisionScan({
    imageBase64,
    mimeType,
    targetLanguage,
  });

  if (wrapperResult.status === "disabled") {
    return { status: "vision_disabled" };
  }
  if (wrapperResult.status === "provider_error") {
    return { status: "provider_error", message: wrapperResult.message };
  }

  const scanId = await createVisionScanRecord({
    userId,
    sourceLanguage: wrapperResult.sourceLanguage || undefined,
    targetLanguage,
    translatedText: wrapperResult.translatedText,
    explanation: wrapperResult.explanation,
  });

  return {
    status: "success",
    scanId,
    sourceLanguage: wrapperResult.sourceLanguage,
    translatedText: wrapperResult.translatedText,
    explanation: wrapperResult.explanation,
  };
}

// ── F10-00: conceder/retirar consentimiento ──
//
// Patrón A (VIAO_DATABASE.md, mismo criterio que `photos`/`searches`):
// escritura directa del propio usuario sobre su propio estado, con el
// cliente de sesión — no requiere `service_role`. Server Action (no una
// llamada directa desde el componente) para que el registro pase por
// código de servidor auditable, con el mismo mecanismo de identidad ya
// establecido (F3-06) en vez de uno paralelo.
export type ConsentActionResult =
  | { status: "success" }
  | { status: "unauthenticated" };

export async function grantVisionConsentAction(): Promise<ConsentActionResult> {
  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
    if (!userId) {
      return { status: "unauthenticated" };
    }

    const { error } = await sessionClient
      .from("vision_consents")
      .insert({ user_id: userId, action: "granted" });
    if (error) {
      throw new Error(`No se pudo registrar el consentimiento: ${error.message}`);
    }
    return { status: "success" };
  } catch (error) {
    if (!userId) {
      return { status: "unauthenticated" };
    }
    throw error;
  }
}

// F10-04 — retirar consentimiento: además de registrar el evento
// "withdrawn", elimina las imágenes derivadas de Vision ya guardadas
// (`photos` con `vision_scan_id` no nulo) y sus archivos en Storage —
// política PROVISIONAL confirmada explícitamente para esta fase: NO se
// borra el historial de texto de `vision_scans` (traducciones/
// explicaciones), que VIAO_DATABASE.md sección 10 trata como
// "conceptualmente separado" de la imagen. El trigger
// `sync_vision_scan_image_retained` (migración 20260818170000) revierte
// `image_retained` a `false` automáticamente al borrar cada `photos`.
export async function withdrawVisionConsentAction(): Promise<ConsentActionResult> {
  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
    if (!userId) {
      return { status: "unauthenticated" };
    }

    const { error: insertError } = await sessionClient
      .from("vision_consents")
      .insert({ user_id: userId, action: "withdrawn" });
    if (insertError) {
      throw new Error(
        `No se pudo registrar la retirada de consentimiento: ${insertError.message}`,
      );
    }

    const { data: visionPhotos, error: selectError } = await sessionClient
      .from("photos")
      .select("id, storage_path")
      .not("vision_scan_id", "is", null);
    if (selectError) {
      throw new Error(
        `No se pudieron recuperar las fotos derivadas de Vision: ${selectError.message}`,
      );
    }

    if (visionPhotos && visionPhotos.length > 0) {
      const paths = visionPhotos.map((photo) => photo.storage_path as string);
      await sessionClient.storage.from("photos").remove(paths);

      const ids = visionPhotos.map((photo) => photo.id as string);
      const { error: deleteError } = await sessionClient
        .from("photos")
        .delete()
        .in("id", ids);
      if (deleteError) {
        throw new Error(
          `No se pudieron eliminar las fotos derivadas de Vision: ${deleteError.message}`,
        );
      }
    }

    return { status: "success" };
  } catch (error) {
    if (!userId) {
      return { status: "unauthenticated" };
    }
    throw error;
  }
}

// ── F10-04: eliminar un escaneo ya realizado ──
export type DeleteVisionScanActionResult =
  | { status: "success"; deleted: boolean }
  | { status: "unauthenticated" }
  | { status: "invalid_scan_id" };

export async function deleteVisionScanAction(
  rawScanId: unknown,
): Promise<DeleteVisionScanActionResult> {
  if (typeof rawScanId !== "string" || !isValidUuid(rawScanId)) {
    return { status: "invalid_scan_id" };
  }

  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return { status: "unauthenticated" };
  }

  const result = await deleteVisionScan(rawScanId, userId);
  return { status: "success", deleted: result.deleted };
}
