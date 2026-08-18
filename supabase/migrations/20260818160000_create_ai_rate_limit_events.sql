-- F9-03 (VIAO_ROADMAP.md) — Rate limiting por usuario para VIAO AI.
--
-- VIAO_ARCHITECTURE.md sección 24: "un contador por usuario con ventana de
-- tiempo... sin introducir infraestructura dedicada nueva solo para esto —
-- se apoya en lo que ya existe en el stack (Supabase o el propio runtime
-- de Vercel)". Se elige Supabase (tabla append-only), NO memoria del
-- proceso: la instrucción de la fase advierte explícitamente contra "un
-- rate limiter falso basado únicamente en memoria del proceso" porque
-- Vercel ejecuta funciones serverless sin estado compartido entre
-- invocaciones — un contador en memoria no protegería nada real.
--
-- Tabla nueva y genérica (no se reutiliza `analytics_events`): mezclar el
-- log de negocio/analytics con el mecanismo de control de coste/abuso
-- sería un acoplamiento incorrecto entre dos responsabilidades distintas
-- (una es "qué pasó, para reportar"; la otra es "cuánto lleva consumido
-- este usuario, para decidir si se le permite otra llamada"). La columna
-- `endpoint` la hace reutilizable para futuros rate limits (p. ej. F10
-- Vision) sin otra migración.
--
-- RLS Patrón B (idéntico a analytics_events, F5-05): ningún acceso de
-- cliente, ni siquiera lectura — es un mecanismo de control interno, no
-- un dato de producto expuesto al usuario. Se concede el GRANT a
-- `service_role` en la misma migración (a diferencia de F5-05/F6-02/
-- F7-01/F8-04, donde el vacío se descubrió después de crear la tabla):
-- ya está documentado el hallazgo recurrente de que `service_role` nunca
-- recibe GRANT automático pese a BYPASSRLS, así que se evita repetir el
-- mismo error aquí.
create table public.ai_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

-- Consulta real de lib/rate-limit/check-rate-limit.ts: contar filas de un
-- usuario+endpoint dentro de la ventana de tiempo (`created_at >= X`).
create index ai_rate_limit_events_user_endpoint_created_idx
  on public.ai_rate_limit_events (user_id, endpoint, created_at);

alter table public.ai_rate_limit_events enable row level security;

-- SELECT: contar los eventos recientes del usuario antes de permitir uno
-- nuevo. INSERT: registrar cada intento permitido. Sin UPDATE/DELETE:
-- append-only por diseño (igual que analytics_events/rewards_transactions)
-- — no existe ningún caso de uso de F9 que modifique o borre una fila ya
-- registrada; una política de retención, si se define, es una decisión
-- futura fuera de esta fase.
grant select, insert on public.ai_rate_limit_events to service_role;
