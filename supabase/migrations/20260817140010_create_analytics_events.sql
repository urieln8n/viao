-- VIAO_DATABASE.md, sección 12 — analytics_events
-- Copia auditable, server-side, de los eventos de negocio críticos de la
-- taxonomía del MVP (VIAO_MVP_v0.1.md sección 13) — complementa a PostHog
-- sin depender de él. La taxonomía de 12 eventos ya está cerrada y
-- aprobada, por eso (a diferencia de `reason`/`reference_type` en
-- rewards_transactions) sí se restringe con un CHECK explícito.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references public.profiles (id) on delete set null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_check check (
    event_name in (
      'registered',
      'search_started',
      'search_completed',
      'hotel_viewed',
      'recommendation_requested',
      'booking_clicked',
      'booking_completed',
      'vision_used',
      'reward_earned',
      'reward_redeemed',
      'referral_created',
      'return_visit'
    )
  )
);

create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_user_id_idx on public.analytics_events (user_id);
create index analytics_events_created_at_idx on public.analytics_events (created_at);
