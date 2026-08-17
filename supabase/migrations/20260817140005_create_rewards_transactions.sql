-- VIAO_DATABASE.md, sección 7 — rewards_transactions
-- Fuente de verdad de todos los movimientos de VIAO Points (ganados y
-- gastados). `reason` y `reference_type` se dejan como texto libre, sin
-- restringir a una lista cerrada: la economía de Points y el catálogo
-- final de `reference_type` son decisiones pendientes (ver sección 15 y
-- VIAO_MVP_v0.1.md sección 18) que este documento explícitamente no fija.

create table public.rewards_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  type text not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  constraint rewards_transactions_amount_nonzero_check check (amount <> 0),
  constraint rewards_transactions_type_check check (type in ('earned', 'spent')),
  constraint rewards_transactions_amount_sign_check check (
    (type = 'earned' and amount > 0) or (type = 'spent' and amount < 0)
  )
);

create index rewards_transactions_user_id_idx on public.rewards_transactions (user_id);
create index rewards_transactions_user_id_created_at_idx on public.rewards_transactions (user_id, created_at);
create index rewards_transactions_reference_id_idx on public.rewards_transactions (reference_id);
