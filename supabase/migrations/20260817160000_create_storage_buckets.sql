-- F1-09 — Crear buckets de Supabase Storage.
-- VIAO_ROADMAP.md (F1-09): "Buckets necesarios creados (imágenes de Vision
-- en tránsito, fotos guardadas) — ninguno público por defecto".
-- VIAO_ARCHITECTURE.md sección 19: dos usos distintos de Storage — fotos
-- que el usuario guarda explícitamente, e imágenes de Vision en tránsito.
--
-- Alcance estrictamente de F1-09: solo la existencia de los buckets con su
-- configuración base (privados, tipos MIME, tamaño máximo). Las políticas
-- de acceso a `storage.objects` son F1-10, no se tocan aquí. La retención/
-- limpieza automática de `vision-scans` queda explícitamente pendiente
-- para Fase 10 (arquitectura secciones 19/21/34) — este bucket solo se
-- crea privado y vacío, sin ningún mecanismo de TTL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('vision-scans', 'vision-scans', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);
