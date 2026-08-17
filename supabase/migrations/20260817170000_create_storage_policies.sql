-- F1-10 — Políticas de acceso (RLS) de Storage sobre storage.objects.
-- VIAO_ROADMAP.md (F1-10): "solo el propietario accede a sus archivos, sin
-- acceso público no autorizado, eliminación posible por el propietario".
-- VIAO_DATABASE.md sección 11 (photos): "las políticas de la tabla deben
-- mantenerse alineadas con las políticas del bucket de Supabase Storage
-- correspondiente".
--
-- RLS ya está activo por defecto en storage.objects (bootstrap de
-- Supabase), y authenticated/anon/service_role ya tienen GRANT base
-- (a diferencia del esquema public) — aquí solo se añaden las políticas
-- que faltan. No se toca storage.buckets (ya creado en F1-09).
--
-- Estrategia de propiedad (aprobada tras verificación empírica):
--   - photos: `owner_id`, asignado automáticamente por Supabase Storage
--     cuando el propio cliente autenticado sube el archivo.
--   - vision-scans: convención de ruta `{user_id}/...`, vía
--     storage.foldername(name) — porque el backend sube con service_role,
--     que deja owner_id en NULL (comprobado, no se intenta fijar a mano).
--
-- Ninguna política menciona `service_role`: sigue bypasseando RLS por
-- diseño (BYPASSRLS) y ya tiene GRANT en el esquema storage.

-- ============================================================
-- photos — upload directo del cliente, propiedad vía owner_id
-- ============================================================

create policy photos_select_own
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);

create policy photos_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and owner_id = auth.uid()::text);

create policy photos_delete_own
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);

-- Sin política de UPDATE: los archivos se reemplazan mediante nueva
-- subida, no mediante UPDATE de fila.

-- ============================================================
-- vision-scans — upload exclusivo del backend (service_role),
-- propiedad lógica vía carpeta {user_id}/...
-- ============================================================

create policy vision_scans_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vision-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sin política de INSERT ni DELETE para `authenticated`: el backend sube
-- y elimina exclusivamente con `service_role` (bypassa RLS), coherente
-- con el Patrón B ya aprobado de la tabla `vision_scans`.

-- Sin política de UPDATE.
