-- Bloque Missions (Prompt Maestro 24/08/2026) — mission_completions:
-- registro append-only de qué Mission completó qué usuario, en qué
-- periodo. La idempotencia real ("una sola vez por periodo") la
-- garantiza la propia constraint UNIQUE, no ninguna comprobación de
-- aplicación — mismo principio ya usado en `goals_one_active_per_user_idx`
-- y `booking_intents_dedup`.
--
-- `period_key`: para las 3 Missions semanales, la semana ISO calculada
-- server-side (TypeScript, `lib/missions/complete-mission.ts`) — nunca
-- confiada del cliente. Para "Definir tu objetivo de viaje" (Mission
-- única para siempre), el valor fijo `'lifetime'` — así la misma
-- constraint impide farmear la Mission cancelando y creando Goals
-- repetidamente: solo puede existir una fila
-- `(user_id, 'goal_created', 'lifetime')` en toda la vida del usuario,
-- sin importar cuántos Goals cree o cancele después.
--
-- `points_awarded`: snapshot de lo realmente otorgado en el momento de
-- la completion. La fuente de verdad económica sigue siendo
-- `rewards_transactions` (`reference_type='mission_completion'`,
-- `reference_id`=id de esta fila) — esta columna es solo para poder
-- medir el coste de Missions sin tener que unir contra el ledger cada
-- vez (mismo criterio ya usado para `bookings.reward_cost`,
-- `VIAO_DATABASE.md` sección 6: "valor denormalizado de conveniencia").

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_key text not null,
  period_key text not null,
  points_awarded integer not null,
  created_at timestamptz not null default now(),
  constraint mission_completions_points_awarded_check check (points_awarded > 0),
  constraint mission_completions_unique unique (user_id, mission_key, period_key)
);

create index mission_completions_user_id_idx on public.mission_completions (user_id);
create index mission_completions_created_at_idx on public.mission_completions (created_at);

alter table public.mission_completions enable row level security;

-- Patrón B, mismo criterio que `rewards_transactions`/`reward_redemptions`:
-- el usuario solo lee sus propias completions, nunca escribe
-- directamente. `service_role` gana SELECT+INSERT únicamente — sin
-- UPDATE ni DELETE, mismo principio append-only del resto del ledger.
create policy mission_completions_select_own
  on public.mission_completions for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.mission_completions to authenticated;
grant select, insert on public.mission_completions to service_role;
