// F7-04 (VIAO_ROADMAP.md) — Montos PROVISIONALES de recompensa en Points.
//
// EXPLÍCITAMENTE PROVISIONAL: estos valores NO representan una conversión
// definitiva Points -> EUR (esa decisión sigue pendiente —
// VIAO_DATABASE.md sección 15, "Economía real de Points... conversión a
// EUR" — y VIAO_MVP_v0.1.md sección 18) ni ninguna promesa económica para
// el piloto. Son números ilustrativos, elegidos únicamente para que el
// ledger sea observable y auditable durante el desarrollo — deben poder
// cambiarse en cualquier momento sin tocar ninguna otra parte del código,
// por eso viven aquí, en un único archivo de configuración, y no
// hardcodeados en las Server Actions/triggers que los consumen.
//
// Sincronización manual necesaria: el trigger SQL de registro
// (supabase/migrations/20260818120000_add_registration_reward_to_profiles_trigger.sql)
// NO puede importar esta constante (SQL no ejecuta TypeScript) — su valor
// numérico está duplicado allí, con un comentario cruzado a este archivo.
// Si se cambia `REGISTRATION_REWARD_POINTS_PROVISIONAL`, esa migración
// también debe actualizarse (mediante una migración nueva, nunca editando
// la histórica).

/**
 * PROVISIONAL — ver cabecera del archivo. Otorgado exactamente una vez
 * por usuario, desde el trigger `handle_new_user()` (no desde código de
 * aplicación: el registro no tiene ninguna Server Action a la que
 * enganchar esto de forma fiable — ver la auditoría en el reporte de la
 * fase). Sincronizado manualmente con esa migración SQL.
 */
export const REGISTRATION_REWARD_POINTS_PROVISIONAL = 100;

/**
 * PROVISIONAL — ver cabecera del archivo. Otorgado desde
 * `app/booking/actions.ts` (F6-03) únicamente cuando una reserva queda
 * realmente `confirmed` — nunca por un simple clic, una reserva rechazada
 * ni un `pending` sin confirmar.
 */
export const BOOKING_REWARD_POINTS_PROVISIONAL = 50;
