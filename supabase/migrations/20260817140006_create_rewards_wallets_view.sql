-- VIAO_DATABASE.md, sección 8 — rewards_wallets
-- VIEW (no tabla) calculada sobre rewards_transactions. Garantiza a nivel de
-- esquema que el saldo nunca se almacena como un número editable: no existe
-- ninguna columna de saldo que se pueda actualizar directamente porque no
-- existe una tabla base con esa columna.
--
-- security_invoker = true: la vista se ejecuta con los permisos del usuario
-- que consulta, heredando automáticamente las políticas RLS que se definan
-- sobre rewards_transactions (F1-06) — no requiere política propia.

create view public.rewards_wallets
with (security_invoker = true) as
select
  user_id,
  sum(amount)::integer as balance
from public.rewards_transactions
group by user_id;
