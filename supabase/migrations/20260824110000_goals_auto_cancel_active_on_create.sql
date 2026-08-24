-- Bloque Goals V1 (VIAO_GOALS_V1_DECISION_LOCK.md, GOAL_PROGRESS_MODEL=
-- WALLET_BALANCE, sección "Goal creation / auto-cancel") — al crear un
-- Goal nuevo, el Goal 'active' anterior del mismo usuario (si existe)
-- pasa automáticamente a 'cancelled', sin exigir un paso manual previo.
--
-- Trigger `BEFORE INSERT` adicional (mismo patrón `SECURITY DEFINER` ya
-- usado por `set_goal_points_at_creation()`/`protect_goal_immutable_fields()`
-- en esta misma tabla) — independiente de esos dos, no los sustituye ni
-- los modifica. El UPDATE que emite pasa por `protect_goal_immutable_fields()`
-- (`20260824090000_*.sql`) como cualquier otro UPDATE sobre `goals`: esa
-- función YA permite exactamente `active -> cancelled` sin importar el
-- origen del UPDATE, así que no fue necesario modificarla.
--
-- Garantía final: sigue siendo `goals_one_active_per_user_idx` (índice
-- único parcial, sin cambios) — este trigger es una conveniencia de UX
-- (evita el paso manual de cancelar antes de crear), nunca la única
-- protección contra dos Goals activos simultáneos. Bajo concurrencia
-- real, el UPDATE de este trigger toma el lock de fila estándar de
-- Postgres sobre cualquier Goal 'active' existente — dos INSERTs
-- concurrentes del mismo usuario se serializan de forma natural sobre esa
-- fila; si no existiera ninguna fila que cancelar (usuario sin Goals
-- previos, doble creación concurrente del primero), el índice único sigue
-- siendo quien decide, exactamente igual que antes de este trigger
-- (`create-goal.ts` ya traduce ese `23505` a `already_has_active_goal`,
-- sin cambios en esa función).

create or replace function public.cancel_active_goal_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.goals
  set status = 'cancelled'
  where user_id = new.user_id and status = 'active';
  return new;
end;
$$;

create trigger goals_cancel_active_before_insert
  before insert on public.goals
  for each row
  execute function public.cancel_active_goal_before_insert();

revoke execute on function public.cancel_active_goal_before_insert() from public, anon, authenticated;
