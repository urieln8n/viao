// F9-03 (VIAO_ROADMAP.md) — Configuración PROVISIONAL/CONFIGURABLE del
// rate limit de VIAO AI. Mismo criterio que lib/referrals/rules.ts
// (F8-03): un único punto de configuración — cambiar el límite requiere
// tocar solo esta constante, nunca números repartidos por el código.
//
// VIAO_ARCHITECTURE.md sección 24: "los valores exactos (umbral, ventana
// de tiempo) no están fijados todavía... el mecanismo debe existir desde
// el primer commit; los números se ajustan después" — igual que la
// sección 23 dice para el control de costes de OpenAI. 5 solicitudes por
// hora es un valor de arranque razonable para el presupuesto de pruebas
// (20-50€, MVP sección 18), no una decisión de negocio definitiva.
export interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
}

/** PROVISIONAL — ver la cabecera de este archivo. */
export const AI_RECOMMENDATION_RATE_LIMIT_PROVISIONAL: RateLimitRule = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
};
