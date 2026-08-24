import { createClient as createSessionClient } from "../supabase/server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — lectura del Goal activo y su
// progreso. Modelo híbrido (Decision Lock del bloque): "Ganado para tu
// objetivo" (`earnedTowardGoal`) es `points_at_goal_creation + SUM de
// transacciones 'earned' desde la creación del Goal` — SOLO avanza,
// nunca baja al canjear un Reward. El saldo real gastable (`Wallet`,
// `get-wallet-balance.ts`) es una cifra DISTINTA que este módulo no
// calcula — quien consuma esto debe mostrar ambas por separado, nunca
// presentarlas como si fueran lo mismo (regla explícita del bloque).
//
// Cálculo en lectura, sin columna almacenada de progreso — mismo
// principio ya aplicado en `rewards_wallets` (vista derivada del
// ledger, nunca una copia que alguien deba mantener sincronizada).
export interface ActiveGoal {
  id: string;
  title: string;
  targetPoints: number;
  targetDate?: string;
  earnedTowardGoal: number;
  createdAt: string;
}

export async function getActiveGoal(): Promise<ActiveGoal | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return undefined;
    }

    const { data: goal, error: goalError } = await sessionClient
      .from("goals")
      .select("id, title, target_points, target_date, points_at_goal_creation, created_at")
      .eq("status", "active")
      .maybeSingle();

    if (goalError || !goal) {
      return undefined;
    }

    // Fase F (auditoría independiente del Bloque 1, hallazgo HIGH) —
    // excluye explícitamente `reason='redemption_refund'`: un refund de
    // `cancel_redemption()` (20260823152000_*.sql) se inserta como
    // `type='earned'` (así lo exige `rewards_transactions_amount_sign_check`
    // — no hay otro `type` posible para un monto positivo), pero NO
    // representa Points genuinamente ganados — es simplemente devolver
    // Points que un canje cancelado nunca debió restar del progreso en
    // primer lugar. Sin esta exclusión, el ciclo canjear→cancelar
    // inflaba "Ganado para tu objetivo" sin ningún Point nuevo real.
    //
    // Denylist (excluir 'redemption_refund') en vez de allowlist de
    // razones "genuinas" (registration/booking/referral, ver
    // `lib/rewards/create-reward-transaction.ts`) — `reason` es texto
    // abierto en todo el proyecto, sin ningún enum cerrado; una allowlist
    // aquí infra-contaría silenciosamente cualquier razón de ganancia
    // genuina futura que no se añadiera a la lista a mano. `reason` es
    // `not null` en el schema (`\d rewards_transactions`), así que no
    // existe el caso NULL que pudiera hacer que `.neq(...)` se comporte
    // de forma inesperada.
    const { data: earnedRows, error: earnedError } = await sessionClient
      .from("rewards_transactions")
      .select("amount")
      .eq("type", "earned")
      .neq("reason", "redemption_refund")
      .gte("created_at", goal.created_at as string);

    if (earnedError) {
      return undefined;
    }

    const earnedSinceCreation = (earnedRows ?? []).reduce(
      (sum, row) => sum + (row.amount as number),
      0,
    );

    return {
      id: goal.id as string,
      title: goal.title as string,
      targetPoints: goal.target_points as number,
      targetDate: (goal.target_date as string | null) ?? undefined,
      earnedTowardGoal: (goal.points_at_goal_creation as number) + earnedSinceCreation,
      createdAt: goal.created_at as string,
    };
  } catch {
    return undefined;
  }
}
