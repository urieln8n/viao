// F7-04 (VIAO_ROADMAP.md) — Economía VIAO Rewards V1 (piloto).
//
// DECISIÓN DE PRODUCTO CONFIRMADA para el piloto: 100 VIAO Points = 1 € de
// valor (`POINTS_PER_EURO`), y una reserva de hotel confirmada otorga el
// 2% de su importe en Points (`HOTEL_BOOKING_REWARD_RATE`). Esto sustituye
// la postura anterior de este archivo ("conversión Points -> EUR pendiente,
// VIAO_DATABASE.md sección 15 / VIAO_MVP_v0.1.md sección 18") — esa
// decisión ya no está pendiente, es la V1 vigente durante el piloto.
//
// Los Points NO son dinero: no son retirables ni transferibles a una
// cuenta bancaria. Representan valor utilizable dentro de VIAO en compras
// elegibles futuras, según las condiciones del producto — F7 sigue sin
// implementar ningún canje real (`create-reward-transaction.ts` solo
// acepta `amount > 0`); este bloque únicamente formaliza el cálculo y la
// comunicación de lo que ya se otorga.
//
// Ambos valores viven aquí, en un único archivo de configuración, para
// poder cambiarse sin tocar ninguna otra parte del código (misma razón que
// ya justificaba `REGISTRATION_REWARD_POINTS_PROVISIONAL` más abajo).
// Fuera de alcance de este bloque: economía de vuelos, coches, eSIM,
// actividades, tarjeta, cashback financiero o Boosts.

/** Points otorgados por cada euro de valor (V1 del piloto: 100 Points = 1 €). */
export const POINTS_PER_EURO = 100;

/** Porcentaje del importe de una reserva de hotel confirmada que se otorga en Points (V1 del piloto: 2%). */
export const HOTEL_BOOKING_REWARD_RATE = 0.02;

/**
 * Points otorgados por una reserva de hotel confirmada, a partir de su
 * importe real (`bookings.booking_value`, en euros) — nunca un valor fijo.
 * Determinista y pura: mismo importe, mismo resultado, sin acceso a red ni
 * a Supabase. Otorgada desde `app/booking/actions.ts` (F6-03) únicamente
 * cuando una reserva queda realmente `confirmed` — nunca por un simple
 * clic, una reserva rechazada ni un `pending` sin confirmar.
 */
export function calculateHotelBookingRewardPoints(bookingValueEur: number): number {
  return Math.floor(bookingValueEur * HOTEL_BOOKING_REWARD_RATE * POINTS_PER_EURO);
}

/** Valor aproximado en euros de una cantidad de Points, según la conversión V1 (`POINTS_PER_EURO`). Puramente informativo: no crea, mueve ni reserva ningún importe real. */
export function pointsToEuroValue(points: number): number {
  return points / POINTS_PER_EURO;
}

/**
 * PROVISIONAL — otorgado exactamente una vez por usuario, desde el trigger
 * `handle_new_user()` (no desde código de aplicación: el registro no tiene
 * ninguna Server Action a la que enganchar esto de forma fiable — ver la
 * auditoría en el reporte de la fase). Sincronizado manualmente con esa
 * migración SQL. Sin fórmula asociada (no deriva de ningún importe), a
 * diferencia de la recompensa de reserva — se mantiene como monto fijo
 * ilustrativo hasta que exista una decisión de producto específica para el
 * registro.
 */
export const REGISTRATION_REWARD_POINTS_PROVISIONAL = 100;

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Economía de Rewards/canje.
//
// `POINTS_PERCENTAGE_OF_COMMISSION` (25%, no 50%): decisión explícita del
// Decision Lock del bloque tras el análisis de sensibilidad de la fase
// económica — deja margen de seguridad mientras no hay datos reales de
// breakage ni de coste real de los primeros Rewards canjeados.
// Informativo/documental en este bloque: todavía no existe ningún flujo
// de earning ligado a comisión de Partner (eso es el bloque de
// Partners+QR) — se centraliza aquí desde ya para que, cuando exista,
// nunca se disperse el número por varios archivos.
export const POINTS_PERCENTAGE_OF_COMMISSION = 0.25;

/**
 * Un Reward solo se aprueba (decisión manual al crear la fila del
 * catálogo, `rewards_catalog.real_cost_eur` — nunca calculado
 * automáticamente en V1) si su coste real no supera este porcentaje del
 * valor nominal en Points.
 *
 * Fase D (auditoría independiente del Bloque 1) — DEBE mantenerse
 * sincronizado manualmente con la constraint
 * `rewards_catalog_viao_real_cost_within_30_percent` en
 * `supabase/migrations/20260824091000_add_rewards_catalog_real_cost_limit.sql`
 * (mismo criterio ya aceptado en el proyecto para
 * `REGISTRATION_REWARD_POINTS_PROVISIONAL`/`VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`:
 * SQL no puede importar una constante de TypeScript). A diferencia de
 * antes de Fase D, esto SÍ se aplica técnicamente — solo para
 * `funding_type='viao'` — vía CHECK constraint sobre `rewards_catalog`,
 * comparando contra el mismo `POINTS_PER_EURO` de este archivo. Para
 * `funding_type='partner'` sigue siendo, como siempre, criterio del
 * propio Partner.
 */
export const MAX_REWARD_REAL_COST_PERCENT = 0.30;

/**
 * Techo mensual del pool de Rewards financiados por VIAO
 * (`rewards_catalog.funding_type='viao'`) — DEBE mantenerse sincronizado
 * manualmente con `v_monthly_pool_limit_eur` en
 * `supabase/migrations/20260823152000_create_redeem_reward_rpc.sql`
 * (mismo criterio ya aceptado en el proyecto para
 * `REGISTRATION_REWARD_POINTS_PROVISIONAL`: SQL no puede importar una
 * constante de TypeScript). Este valor es solo para mostrar/documentar
 * en TypeScript — el valor que realmente aplica el kill-switch es el de
 * la función SQL, no este.
 */
export const VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR = 100.0;
