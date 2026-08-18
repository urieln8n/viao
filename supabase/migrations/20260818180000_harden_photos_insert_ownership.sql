-- F10 (revisión final) — Endurece photos_insert_own: WITH CHECK solo
-- validaba user_id = auth.uid(), nunca que trip_id/vision_scan_id
-- pertenecieran realmente al mismo usuario.
--
-- Hallazgo real, verificado empíricamente durante la revisión final de
-- F10 (primera fase que escribe de verdad en `photos`): un usuario
-- autenticado podía insertar una fila propia (`user_id` correcto, pasa
-- RLS) apuntando `trip_id` a un viaje ajeno, o `vision_scan_id` a un
-- escaneo ajeno — Postgres no rechazaba el insert porque el `WITH CHECK`
-- original (20260817150000_enable_rls_and_policies.sql) nunca comprobaba
-- esas dos columnas. Efecto observado: el trigger
-- `sync_vision_scan_image_retained` (20260818170000_setup_vision.sql)
-- marcaba `image_retained=true` en el escaneo AJENO sin que su
-- propietario hubiera guardado nada. No se filtran datos del propietario
-- al atacante (su propia `photos_select_own` sigue devolviendo solo sus
-- filas), pero es una violación real de integridad entre usuarios que
-- conviene cerrar ahora — es la primera fase que ejercita escritura real
-- en esta tabla.
--
-- No se edita la migración histórica: se elimina y recrea únicamente la
-- policy `photos_insert_own`, mismo patrón ya usado en el proyecto para
-- evolucionar RLS sin tocar migraciones pasadas (p. ej.
-- 20260818150000_fix_rewards_transactions_idempotency_per_user.sql).
--
-- Mecanismo: el propio WITH CHECK ya usado en toda VIAO (subconsulta
-- EXISTS contra la tabla referenciada) — no es infraestructura nueva.
-- trip_id es NOT NULL, así que siempre se exige que exista y pertenezca
-- al usuario; vision_scan_id es NULL-able (una foto guardada de un viaje
-- sin pasar por Vision), así que solo se exige la comprobación cuando no
-- es NULL.
drop policy photos_insert_own on public.photos;

create policy photos_insert_own
  on public.photos for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.trips
      where id = trip_id and user_id = auth.uid()
    )
    and (
      vision_scan_id is null
      or exists (
        select 1 from public.vision_scans
        where id = vision_scan_id and user_id = auth.uid()
      )
    )
  );
