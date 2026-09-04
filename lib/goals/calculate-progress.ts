// P14.4-E (Decision Lock OPCIÓN B, sustituye a GOAL_PROGRESS_MODEL=
// WALLET_BALANCE) — función pura, sin ninguna dependencia de
// `next/headers`/Supabase. Vive en su propio archivo, separada de
// `get-goal.ts` (que sí importa `createSessionClient`, solo válido en
// Server Components) precisamente para que `app/goal-card.tsx` (Client
// Component) pueda importarla sin arrastrar ese árbol de dependencias
// server-only al bundle del cliente — comprobado en build: un import de
// VALOR (no solo de tipo) desde `get-goal.ts` rompía `next build`
// exactamente por ese motivo (Turbopack: "You're importing a module
// that depends on next/headers... in the Pages Router").
//
// La función en sí no cambia (sigue siendo un simple ratio capado a
// 100) — lo que cambia es QUÉ valor recibe como primer argumento: ya no
// es el saldo de Wallet (que sube y baja con cada canje/refund), es
// `earnedPoints` (`lib/goals/get-earned-points.ts`, "Points acumulados
// ganados hacia este Goal desde su creación") — monótono, nunca baja al
// canjear. Renombrado el parámetro para reflejar esto explícitamente,
// sin ningún cambio de comportamiento aritmético. `targetPoints` no
// positivo (dato inválido, nunca debería ocurrir gracias al CHECK de la
// tabla `goals`, pero esta función no confía en eso) devuelve 0 en vez
// de `NaN`/`Infinity`.
export function calculateGoalProgressPercent(earnedPoints: number, targetPoints: number): number {
  if (!(targetPoints > 0)) {
    return 0;
  }
  return Math.min(100, Math.round((earnedPoints / targetPoints) * 100));
}
