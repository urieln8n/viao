-- Fase D (auditoría independiente del Bloque 1, hallazgo C) — Goals eran
-- tamper-proof solo en INSERT: el trigger `set_goal_points_at_creation()`
-- (20260823153000_*.sql) es `before insert`, nunca `before update`, y la
-- policy `goals_update_own` no restringe columnas ni transiciones. Un
-- cliente autenticado podía hacer
-- `sessionClient.from("goals").update({points_at_goal_creation: N})`
-- directamente sobre su propio Goal y el valor se aceptaba tal cual.
--
-- Corrección: un segundo trigger `security definer`, `before update`,
-- mismo mecanismo ya usado para INSERT. No se toca la policy RLS
-- (sigue siendo Patrón A) ni ningún archivo de `lib/goals/`:
-- `cancelGoal()` solo envía `{status: 'cancelled'}`, que sigue pasando
-- limpio por este trigger sin cambios.
--
-- Reglas:
-- 1. `points_at_goal_creation`, `target_points`, `title`, `target_date`,
--    `user_id`, `created_at` son inmutables tras la creación — ningún
--    UPDATE puede cambiarlos, bajo ninguna circunstancia. No existe hoy
--    ninguna función de "editar objetivo": esto no reduce ninguna
--    capacidad que estuviera realmente en uso.
-- 2. `status` solo puede transicionar de 'active' a 'cancelled' vía
--    UPDATE. Reactivar un Goal cancelado, saltar a 'completed', o
--    cualquier otra transición, se rechaza explícitamente.

create or replace function public.protect_goal_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.points_at_goal_creation is distinct from old.points_at_goal_creation
    or new.target_points is distinct from old.target_points
    or new.title is distinct from old.title
    or new.target_date is distinct from old.target_date
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'goal_immutable_field_change';
  end if;

  if new.status is distinct from old.status then
    if not (old.status = 'active' and new.status = 'cancelled') then
      raise exception 'goal_invalid_status_transition';
    end if;
  end if;

  return new;
end;
$$;

create trigger goals_protect_immutable_fields
  before update on public.goals
  for each row
  execute function public.protect_goal_immutable_fields();

revoke execute on function public.protect_goal_immutable_fields() from public, anon, authenticated;
