-- F7-01 (VIAO_ROADMAP.md) — Idempotencia para rewards_transactions.
--
-- Auditoría previa (Paso 0 de F7): `\d public.rewards_transactions` contra
-- Supabase local mostró CERO constraints UNIQUE más allá de la PK — nada
-- impide insertar dos transacciones idénticas para el mismo evento. Esto
-- es crítico porque la recompensa de reserva confirmada (F7-04) se otorga
-- desde `app/booking/actions.ts`, una Server Action reintentable (doble
-- clic, refresh, reintento de red) — sin esta constraint, una ejecución
-- duplicada crearía Points duplicados.
--
-- `UNIQUE (reason, reference_type, reference_id)`: cubre exactamente el
-- caso con referencia (p. ej. `reason='booking'`,
-- `reference_type='booking'`, `reference_id=<bookings.id>`) — como máximo
-- una recompensa por esa combinación exacta, para siempre. Se usa como
-- constraint completa (no parcial) porque en este caso las tres columnas
-- SIEMPRE llegan pobladas desde el código que las usa
-- (`lib/rewards/create-reward-transaction.ts`) — permite además usar
-- `ON CONFLICT (reason, reference_type, reference_id) DO NOTHING` desde
-- supabase-js (`.upsert(..., {ignoreDuplicates: true})`) sin necesitar un
-- índice parcial con predicado (Postgres solo infiere automáticamente
-- índices parciales como "arbiter" si el propio ON CONFLICT repite el
-- predicado; una constraint completa evita esa complicación).
--
-- NO cubre la recompensa de registro (`reason='registration'`, sin
-- referencia: `reference_type`/`reference_id` quedan NULL) — Postgres
-- trata cada NULL como distinto en una constraint UNIQUE, así que esta
-- constraint NO deduplicaría dos filas con ambas columnas NULL. Ese caso
-- se protege por un mecanismo distinto y más fuerte: la recompensa de
-- registro se otorga desde el trigger `handle_new_user()`
-- (ver migración 20260818120000_*.sql), que solo puede dispararse UNA VEZ
-- por usuario por construcción (`AFTER INSERT ON auth.users`, y un alta de
-- cuenta solo inserta esa fila una vez) — no necesita una constraint de
-- aplicación para lograr exactamente-una-vez. Aun así, esa migración
-- añade también un `ON CONFLICT ... DO NOTHING` de defensa en profundidad
-- sobre el índice parcial de abajo (control total del SQL al ser un
-- trigger escrito a mano, sin las limitaciones de supabase-js/PostgREST).

alter table public.rewards_transactions
  add constraint rewards_transactions_reference_reason_unique
  unique (reason, reference_type, reference_id);

-- Defensa en profundidad para el camino de registro (ver nota arriba):
-- como máximo una fila con reason='registration' por usuario.
create unique index rewards_transactions_registration_once_idx
  on public.rewards_transactions (user_id)
  where reason = 'registration';
