-- Fase D (auditoría independiente del Bloque 1, hallazgo del 30%) —
-- `MAX_REWARD_REAL_COST_PERCENT` (lib/rewards/rules.ts) existía solo como
-- constante documental: ninguna validación técnica impedía crear un
-- Reward `funding_type='viao'` cuyo `real_cost_eur` superara el 30% del
-- valor nominal de su `points_cost`.
--
-- "Valor nominal" reutiliza la ÚNICA conversión que ya existe en todo el
-- proyecto para esto (`POINTS_PER_EURO = 100`, lib/rewards/rules.ts,
-- misma cifra ya mostrada en Home/Wallet vía `pointsToEuroValue()`) — no
-- se inventa una segunda. La constraint COMPARA `real_cost_eur` contra
-- ese nominal, nunca lo DERIVA ni lo sobrescribe: `real_cost_eur` sigue
-- siendo, exactamente igual que antes, un valor declarado a mano al
-- crear la fila (20260823150000_*.sql) — esto es una cota de cordura
-- económica sobre esa entrada manual, no una fórmula que la reemplace.
--
-- Sincronización manual requerida (mismo patrón ya aceptado en el
-- proyecto para `REGISTRATION_REWARD_POINTS_PROVISIONAL` y para
-- `v_monthly_pool_limit_eur`): 0.30 y 100 deben coincidir con
-- `MAX_REWARD_REAL_COST_PERCENT` y `POINTS_PER_EURO` en
-- lib/rewards/rules.ts — SQL no puede importar una constante de TS.
--
-- Alcance: solo `funding_type='viao'`. Un Reward `funding_type='partner'`
-- puede tener `real_cost_eur` NULL (coste asunto del Partner, no
-- contabilizado contra ningún pool de VIAO) o, si se declara, no está
-- sujeto a este techo — VIAO no controla cuánto decide invertir un
-- Partner en su propia promoción.
--
-- `NOT VALID`: la base de datos local puede contener filas de test de
-- sesiones anteriores (rewards_catalog no tiene GRANT de DELETE,
-- confirmado en la auditoría) con ratios deliberadamente fuera de este
-- 30% para estresar el kill-switch del pool mensual — un caso
-- legítimamente distinto de esta regla. `NOT VALID` aplica la
-- constraint solo a partir de ahora (nuevos INSERT/UPDATE), sin
-- re-validar ni tocar el histórico.

alter table public.rewards_catalog
  add constraint rewards_catalog_viao_real_cost_within_30_percent
  check (
    funding_type <> 'viao'
    or real_cost_eur <= 0.30 * (points_cost::numeric / 100)
  ) not valid;
