import {
  VISION_ALLOWED_MIME_TYPES,
  VISION_MAX_IMAGE_SIZE_BYTES,
} from "./config";

// F10-01 (VIAO_ROADMAP.md) — Validación server-side de la imagen, PRIMERA
// barrera de coste (VIAO_ARCHITECTURE.md sección 23): se ejecuta antes de
// tocar el rate limit o el wrapper de OpenAI (ver app/vision/actions.ts).
// Función PURA (sin I/O), testable de forma aislada.
//
// "No aceptar simplemente la extensión del archivo" (F10-01): además del
// MIME type declarado (`File.type`, que el cliente controla y podría
// falsear), se comprueban los primeros bytes reales del archivo contra la
// firma binaria conocida de cada formato permitido — un .txt renombrado a
// .jpg con Content-Type "image/jpeg" no supera esta comprobación.
export interface ValidateImageInput {
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
}

export type ValidateImageResult =
  | { valid: true }
  | { valid: false; reason: "empty" | "too_large" | "invalid_mime_type" | "corrupted" };

function matchesSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export function validateImage({
  mimeType,
  sizeBytes,
  bytes,
}: ValidateImageInput): ValidateImageResult {
  if (sizeBytes <= 0) {
    return { valid: false, reason: "empty" };
  }
  if (sizeBytes > VISION_MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, reason: "too_large" };
  }
  if (!VISION_ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, reason: "invalid_mime_type" };
  }
  if (!matchesSignature(bytes, mimeType)) {
    return { valid: false, reason: "corrupted" };
  }
  return { valid: true };
}
