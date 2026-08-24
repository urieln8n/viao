// Bloque Goals V1 (VIAO_GOALS_V1_DECISION_LOCK.md, GOAL_PROGRESS_MODEL=
// WALLET_BALANCE, aprobado por el propietario) — función pura, sin
// ninguna dependencia de `next/headers`/Supabase. Vive en su propio
// archivo, separada de `get-goal.ts` (que sí importa
// `createSessionClient`, solo válido en Server Components) precisamente
// para que `app/goal-card.tsx` (Client Component) pueda importarla sin
// arrastrar ese árbol de dependencias server-only al bundle del cliente
// — comprobado en build: un import de VALOR (no solo de tipo) desde
// `get-goal.ts` rompía `next build` exactamente por ese motivo
// (Turbopack: "You're importing a module that depends on
// next/headers... in the Pages Router").
//
// `progress_percent` oficial de VIAO V1: capado a 100, sin excepciones
// por `reason` — la aritmética real del Wallet gobierna el resultado
// directamente (earn sube, redeem baja, refund sube, sin ningún caso
// especial). `targetPoints` no positivo (dato inválido, nunca debería
// ocurrir gracias al CHECK de la tabla `goals`, pero esta función no
// confía en eso) devuelve 0 en vez de `NaN`/`Infinity`.
export function calculateGoalProgressPercent(walletBalance: number, targetPoints: number): number {
  if (!(targetPoints > 0)) {
    return 0;
  }
  return Math.min(100, Math.round((walletBalance / targetPoints) * 100));
}
