-- VIAO_DATABASE.md, sección 9 — referrals
-- Trazabilidad del sistema de referidos.

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  referral_code_used text not null,
  status text not null default 'pending',
  valid_action_completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referrals_no_self_referral_check check (referrer_id <> referred_id),
  constraint referrals_referred_id_key unique (referred_id),
  constraint referrals_status_check check (status in ('pending', 'rewarded', 'invalid'))
);

create index referrals_referrer_id_idx on public.referrals (referrer_id);
