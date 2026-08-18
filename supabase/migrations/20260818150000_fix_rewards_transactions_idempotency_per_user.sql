-- F8-04 (VIAO_ROADMAP.md) — Corrección de la constraint de idempotencia
-- de rewards_transactions para permitir múltiples usuarios sobre la MISMA
-- referencia (caso real nuevo en F8: una referral recompensa a DOS
-- usuarios distintos — referrer y referred — con el mismo
-- `reference_type='referral'`, `reference_id=referral.id`).
--
-- HALLAZGO EMPÍRICO (Paso 0/F8-04, verificado con un test real contra
-- Supabase local antes de esta migración, no asumido): la constraint
-- `rewards_transactions_reference_reason_unique`
-- (`UNIQUE (reason, reference_type, reference_id)`, creada en F7-01,
-- migración histórica 20260818100000_*.sql — NO SE EDITA) fue diseñada
-- correctamente para el único caso que F7 necesitaba (recompensa de
-- reserva: exactamente un usuario por `bookingId`, así que
-- `reference_id` por sí solo ya identificaba la recompensa de forma
-- única). F8-04 expone un caso que F7 nunca ejerció: DOS usuarios
-- distintos, cada uno con su propia recompensa, apuntando al MISMO
-- `reference_id` (`referral.id`). Con la constraint original, el segundo
-- `INSERT` (para el segundo usuario) violaba la UNIQUE existente y
-- `.upsert(..., {ignoreDuplicates: true})` lo descartaba en silencio como
-- si fuera un duplicado — perdiendo una recompensa real. Confirmado con
-- un test de integración real (`lib/referrals/complete-referral-action.test.ts`)
-- que fallaba exactamente así antes de esta migración.
--
-- Corrección: se sustituye la constraint por una que también incluye
-- `user_id` — `UNIQUE (user_id, reason, reference_type, reference_id)`.
-- Esto sigue impidiendo exactamente lo que F7-01 necesitaba (un mismo
-- usuario no puede recibir dos recompensas por la misma referencia: el
-- caso de reserva sigue protegido, `user_id` era ya implícitamente único
-- por `bookingId` en ese caso, así que el comportamiento no cambia para
-- F7) y además permite correctamente que dos usuarios DISTINTOS tengan,
-- cada uno, su propia recompensa idempotente sobre la misma referencia.
--
-- Compatibilidad: `lib/rewards/create-reward-transaction.ts` (F7-01) se
-- actualiza en el mismo cambio para que su `onConflict` coincida
-- exactamente con la nueva constraint (Postgres exige que el conflict
-- target del `ON CONFLICT` coincida con un índice/constraint único real).
--
-- No se modifica ninguna migración histórica: esta es una migración
-- nueva que sustituye la constraint mediante DROP + ADD, sobre la tabla
-- ya existente. Alcance mínimo: no se toca ningún otro índice, GRANT ni
-- policy.

alter table public.rewards_transactions
  drop constraint rewards_transactions_reference_reason_unique;

alter table public.rewards_transactions
  add constraint rewards_transactions_user_reference_reason_unique
  unique (user_id, reason, reference_type, reference_id);
