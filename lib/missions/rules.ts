// Bloque Missions (Prompt Maestro 24/08/2026) — reglas explícitas y
// auditables, sin motor configurable: añadir/cambiar una Mission es un
// cambio de código, nunca una fila editable por nadie.
//
// Los Points de cada Mission están TAMBIÉN declarados en SQL
// (supabase/migrations/20260824101000_create_complete_mission_rpc.sql,
// función `complete_mission()`) — esa es la fuente de verdad económica
// real, protegida incluso si este archivo tuviera un bug. Este archivo
// DEBE mantenerse sincronizado a mano con esa función — mismo criterio
// ya aceptado en el proyecto para
// `REGISTRATION_REWARD_POINTS_PROVISIONAL`/`VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`
// (`lib/rewards/rules.ts`): SQL no puede importar una constante de
// TypeScript.
//
// Cuatro Missions aprobadas (Prompt Maestro 24/08/2026) — ninguna
// depende de Vision, ninguna es `referral_created` (ya genera una
// recompensa sustancial propia, evita doble recompensa por la misma
// acción). "Definir tu objetivo de viaje" es `periodicity: "lifetime"`
// deliberadamente, no "weekly": si usara un periodo de calendario, un
// usuario podría cancelar su Goal y crear uno nuevo repetidamente para
// volver a cobrar los Points — con `periodicity: "lifetime"` (ver
// `complete-mission.ts`, `period_key` fijo `'lifetime'`), la propia
// constraint `UNIQUE(user_id, mission_key, period_key)` solo permite
// una fila para siempre, sin importar cuántos Goals cree o cancele el
// usuario después.
//
// FASE J-B4 (Core Reset — Dependency Exit, Product Decision Lock
// 2026-08-27) — `search_started` y `hotel_viewed` dependían
// exclusivamente de rutas Travel (`app/search`, `app/properties/[id]`,
// ya sin entrada de navegación) y quedan sustituidas:
// `partner_activity_registered` (reemplaza `hotel_viewed`, dispara
// directamente el loop Partner->Points, `app/partners/actions.ts`, tras
// un `complete_partner_activity()` exitoso) y `profile_completed`
// (reemplaza `search_started`, activación temprana independiente de la
// densidad real de Partners todavía baja en el piloto — deliberadamente
// NO una segunda Mission de Partners, ver Product Decision Lock §B).
// `return_visit` y `goal_created` no se tocan — mismo trigger, mismos
// Points, mismo `key`. Migración SQL correspondiente:
// `supabase/migrations/20260827140000_update_complete_mission_rpc_core_reset.sql`.
export type MissionPeriodicity = "weekly" | "lifetime";

export interface MissionDefinition {
  key: string;
  name: string;
  points: number;
  periodicity: MissionPeriodicity;
}

export const MISSIONS: readonly MissionDefinition[] = [
  { key: "profile_completed", name: "Completa tu perfil", points: 10, periodicity: "lifetime" },
  { key: "return_visit", name: "Volver esta semana", points: 10, periodicity: "weekly" },
  { key: "partner_activity_registered", name: "Registra tu primera actividad con un Partner esta semana", points: 10, periodicity: "weekly" },
  { key: "goal_created", name: "Definir tu objetivo de viaje", points: 50, periodicity: "lifetime" },
];

/**
 * Techo mensual de emisión de Points vía Missions — DEBE mantenerse
 * sincronizado con `v_monthly_pool_limit_points` en la función SQL
 * `complete_mission()`. Solo informativo/documental en TypeScript: el
 * valor que realmente aplica el kill-switch es el de la función SQL,
 * no este (mismo criterio ya usado para
 * `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`). Independiente del pool de
 * canje de Rewards — presupuestos separados, nunca se suman.
 */
export const MISSIONS_POOL_MONTHLY_LIMIT_POINTS = 3000;

export function getMissionDefinition(missionKey: string): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.key === missionKey);
}
