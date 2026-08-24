-- Bloque 1 (VIAO_V1_LOOP_DECISION.md) — rewards_catalog.
--
-- Catálogo de Rewards canjeables con Points. RLS Patrón B con lectura
-- abierta (mismo criterio que properties/destinations, migraciones
-- 20260817150000_*.sql / 20260823140000_*.sql: catálogo, no dato
-- personal) — escritura exclusivamente service_role, nunca el cliente.
--
-- `real_cost_eur`: coste REAL en euros de este Reward, introducido
-- manualmente al crear la fila — nunca calculado automáticamente en V1
-- (decisión de producto, Fase F/Decision Lock del bloque). Es un dato
-- DISTINTO de `points_cost` (lo que el usuario paga en Points, valor
-- nominal) — nunca se deriva el uno del otro. Obligatorio cuando
-- `funding_type='viao'`: es la cifra que el kill-switch del pool mensual
-- suma contra su techo (ver 20260823152000_create_redeem_reward_rpc.sql)
-- — NUNCA una conversión de `points_cost` vía `pointsToEuroValue()`
-- (esa es la equivalencia nominal comunicada al usuario, no el coste
-- real). Para `funding_type='partner'`, el coste real es asunto del
-- propio Partner y no se contabiliza contra ningún pool de VIAO — por
-- eso puede quedar NULL en ese caso.
--
-- `partner_name`: texto libre deliberadamente. NO es FK a una tabla
-- `partners` — esa tabla no existe todavía y está fuera de alcance del
-- Bloque 1 (queda para el bloque de Partners+QR).

create table public.rewards_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  funding_type text not null check (funding_type in ('viao', 'partner')),
  real_cost_eur numeric(10,2),
  partner_name text,
  limit_per_user integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rewards_catalog_viao_requires_real_cost check (
    funding_type <> 'viao' or real_cost_eur is not null
  )
);

alter table public.rewards_catalog enable row level security;

-- Igual que properties/destinations: catálogo legible por cualquier
-- usuario autenticado, sin ninguna vía de escritura para el cliente.
grant select on public.rewards_catalog to authenticated;
grant select, insert, update on public.rewards_catalog to service_role;

create policy rewards_catalog_select_all
  on public.rewards_catalog for select
  to authenticated
  using (true);
