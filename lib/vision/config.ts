// F10-01 (VIAO_ROADMAP.md) — Límites de validación de imagen, en un único
// lugar. Reutiliza EXACTAMENTE los valores ya aprobados y en producción
// desde F1-09 (supabase/migrations/20260817160000_create_storage_buckets.sql,
// bucket `photos`/`vision-scans`: `file_size_limit=10485760`,
// `allowed_mime_types=['image/jpeg','image/png','image/webp']`) — no se
// inventa un límite provisional distinto cuando el proyecto ya tiene uno
// documentado y activo en Supabase Storage; sería inconsistente aceptar
// aquí una imagen que el bucket rechazaría al guardarla (F10-04), o
// viceversa.
export const VISION_ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const VISION_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
