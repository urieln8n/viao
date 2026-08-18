-- F13-07 (VIAO_ROADMAP.md) — Auditoría de Supabase Storage, bucket
-- `photos`. Vulnerabilidad real encontrada y reproducida durante F13-07:
-- la política `photos_insert_own`
-- (supabase/migrations/20260817170000_create_storage_policies.sql, F1-10)
-- solo comprueba `owner_id = auth.uid()` — Supabase Storage asigna
-- `owner_id` automáticamente al usuario que sube el archivo, así que esa
-- comprobación SIEMPRE es cierta para cualquier subida propia del
-- atacante, sin importar el `name` (ruta) del objeto. Un usuario B podía
-- subir un archivo con `name = '<user_id_de_A>/archivo-inyectado.jpg'`
-- (owner_id=B, dentro de lo que aparenta ser la carpeta de A) — la
-- política lo aceptaba.
--
-- Exploit reproducido empíricamente antes de esta migración: usuario B
-- autenticado, `supabase.storage.from('photos').upload('<uid_A>/x.jpg', ...)`
-- -> éxito (sin error).
--
-- Impacto real (acotado, pero real): NO permite a B leer/descargar/listar
-- ni eliminar archivos REALES de A (`photos_select_own`/`photos_delete_own`
-- siguen protegidos por `owner_id`, que Supabase Storage asigna de forma
-- fiable y el cliente no puede falsificar) — pero sí permite "contaminar"
-- el espacio de nombres de la carpeta de otro usuario con objetos
-- ajenos, contradiciendo el diseño documentado ("cada usuario en su
-- propia carpeta", VIAO_ARCHITECTURE.md sección 19) y el patrón YA usado
-- correctamente en la política vecina `vision_scans_select_own` de la
-- misma migración histórica (`(storage.foldername(name))[1] = auth.uid()`).
--
-- Corrección mínima: añadir la MISMA comprobación de prefijo de ruta que
-- ya usa `vision_scans_select_own`, como condición ADICIONAL (no
-- sustituta) de `owner_id = auth.uid()`. Verificado antes de este cambio
-- que la ÚNICA subida real de la aplicación
-- (app/vision/vision-view.tsx) ya construye
-- `storagePath = \`${user.id}/${scanResult.scanId}.${extension}\`` — el
-- prefijo YA coincide con `auth.uid()` en el único flujo legítimo
-- existente, así que este endurecimiento no cambia ningún comportamiento
-- real, solo cierra el vector de ataque.
--
-- Nunca se edita la migración histórica 20260817170000_*.sql — aquí se
-- sustituye la política completa vía DROP+CREATE (Postgres no tiene
-- `CREATE OR REPLACE POLICY`).
--
-- Alcance mínimo: solo se toca `photos_insert_own` — las políticas de
-- SELECT/DELETE (`photos_select_own`/`photos_delete_own`) ya son seguras
-- de por sí (`owner_id` no puede ser falsificado por el cliente, Supabase
-- Storage lo asigna server-side), así que añadir ahí el mismo chequeo de
-- ruta no cambiaría ningún comportamiento — no se toca lo que ya está
-- probado como seguro.

drop policy if exists photos_insert_own on storage.objects;

create policy photos_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );
