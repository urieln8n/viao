-- UX-10 (Partners Visible + Discovery + Registration) — separación TEST vs
-- REAL en `partners` (auditoría §18): confirmado por lectura directa
-- (service_role, sin JOIN) que las 1.437 filas existentes hoy son el
-- 100% fixtures/datos de test (ningún Partner real ha sido dado de alta
-- todavía) — ninguna sirve como base fiable para filtrar por nombre/slug
-- de forma genérica (algunas fixtures manuales de auditorías previas no
-- comparten el prefijo `test-partner-` que sí usan los tests
-- automatizados, p.ej. "Restaurante Prueba PB5", "UX9 schema test *").
-- En vez de una heurística de texto frágil, se añade una señal explícita
-- y booleana — mismo criterio ya establecido en el proyecto para "nunca
-- borrar, marcar con un flag" (`active`, `status`).
--
-- `is_test boolean not null default false`: toda fila NUEVA (altas reales
-- vía Partner Registration de este bloque, o altas manuales futuras vía
-- Supabase Studio) nace `is_test=false` por defecto — el valor `true`
-- solo lo fuerzan explícitamente los propios tests automatizados al crear
-- su fixture (cambio de código en cada `*.test.ts`, no de constraint).
--
-- Backfill no destructivo (UPDATE, nunca DELETE, mismo criterio que
-- CORE-1/2/3/4): las 1.437 filas ya existentes se marcan `is_test=true`
-- — confirmado que el 100% son fixtures, cero Partners reales a fecha de
-- este bloque.
alter table public.partners
  add column is_test boolean not null default false;

update public.partners set is_test = true;
