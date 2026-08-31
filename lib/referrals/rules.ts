// F8-03/F8-04 (VIAO_ROADMAP.md) — Configuración de la "acción válida" de
// referidos y montos PROVISIONALES.
//
// MVP sección 18, punto 4: "Definición de 'acción válida' que activa la
// recompensa de referido, y monto exacto de puntos por referido" —
// EXPLÍCITAMENTE una decisión de negocio pendiente, no una implementación
// técnica ya aprobada (a diferencia de F7-04, donde los montos de
// registro/reserva sí estaban aprobados como provisionales). Este archivo
// es el ÚNICO punto de configuración de F8-03: cambiar qué cuenta como
// acción válida, o los montos, requiere tocar solo este archivo — nunca
// lógica dispersa (`if (...)` repetidos) por Server Actions/triggers.
//
// Opción técnica actual (auditada antes de fijarla, Paso 0 de F8): una
// reserva confirmada (F6-03, `bookingResult.status === "confirmed"`) es
// el ÚNICO evento de "acción significativa y verificable del usuario" que
// ya existe de forma fiable en todo el sistema, aparte del propio
// registro — que no puede ser la acción válida por definición ("no basta
// con registrarse", MVP sección 12). Por eso
// `VALID_REFERRAL_ACTION_TRIGGER` vale `"booking_confirmed"` HOY: es la
// implementación técnica PROVISIONAL más coherente con el modelo
// existente, NO una decisión de producto definitiva. Si el negocio define
// una acción distinta (p. ej. una reserva de importe mínimo, o N
// reservas), ese cambio se hace ÚNICAMENTE aquí — `app/booking/actions.ts`
// y `lib/referrals/complete-referral-action.ts` solo comprueban esta
// constante, nunca redefinen la condición por su cuenta.
export type ValidReferralActionTrigger = "booking_confirmed";

/**
 * PROVISIONAL / CONFIGURABLE / PENDIENTE DE DEFINICIÓN DE NEGOCIO.
 * Ver la cabecera de este archivo para la justificación completa.
 *
 * FASE J-B4 (Core Reset — Dependency Exit) — este valor queda tal cual,
 * sin tocar: `app/booking/actions.ts` sigue consultándolo (fuera de
 * alcance de esta fase, HARD RULE explícita de no modificar Booking) y
 * ya es inerte en la práctica desde J-B1/J-B2.5 — Booking no tiene
 * ninguna entrada de navegación, así que este camino nunca se dispara
 * hoy. El mecanismo REALMENTE activo desde esta fase es
 * `PARTNER_ACTIVITY_REFERRAL_TRIGGER`, más abajo.
 */
export const VALID_REFERRAL_ACTION_TRIGGER: ValidReferralActionTrigger =
  "booking_confirmed";

// FASE J-B4 (Core Reset — Dependency Exit, Product Decision Lock
// 2026-08-27) — nuevo modelo de "acción válida" de Referrals,
// independiente de Travel/Booking: un evento único (como el de arriba)
// es gameable por una sola visita fabricada entre referrer y referido,
// así que se sustituye por un modelo de UMBRAL. El referido debe
// completar al menos `minCount` Partner activities confirmadas
// (`partner_activities` — cada fila ya nace confirmada por el propio
// Partner, PMM3/LOCKED) antes de que se otorgue la recompensa a ambas
// partes. `minCount = 2`: resiste la colusión de una sola visita
// fabricada, sin retrasar la recompensa hasta un evento tardío o poco
// frecuente (ver Product Decision Lock, sección Referrals, para la
// comparación completa frente a otras alternativas consideradas).
export interface PartnerActivityCountReferralTrigger {
  type: "partner_activity_count";
  minCount: number;
}

export const PARTNER_ACTIVITY_REFERRAL_TRIGGER: PartnerActivityCountReferralTrigger = {
  type: "partner_activity_count",
  minCount: 2,
};

// Montos PROVISIONALES — igual que `lib/rewards/rules.ts` (F7-04): NO
// representan ninguna conversión definitiva a EUR ni ninguna promesa
// económica del piloto. Sincronización manual necesaria si se cambian:
// no hay ningún trigger SQL que dependa de estos valores (a diferencia de
// F7-04/registro), así que solo viven aquí.
/** PROVISIONAL — Points otorgados al REFERIDOR cuando el referido completa la acción válida. */
export const REFERRER_REWARD_POINTS_PROVISIONAL = 100;

/** PROVISIONAL — Points otorgados al REFERIDO (nunca al registrarse por sí solo, solo al completar la acción válida) cuando esta se cumple. */
export const REFERRED_REWARD_POINTS_PROVISIONAL = 50;
