import { createClient as createSessionClient } from "../supabase/server";
import { getEarnedPointsTowardGoal } from "./get-earned-points";
import { completeGoalIfThresholdMet } from "./complete-goal-if-threshold-met";

// P14.4-E (Decision Lock OPCIÓN B, aprobado por el propietario —
// VIAO_P14_4_D_P0_DECISIONS.md §5, VIAO_P14_4_E_P0_IMPLEMENTATION.md) —
// reactiva el modelo histórico de progreso ("Points acumulados ganados
// hacia el Goal desde su creación", NUNCA baja al canjear), sustituyendo
// al modelo V1 anterior (`GOAL_PROGRESS_MODEL=WALLET_BALANCE`, progreso =
// saldo actual de Wallet) — ese modelo V1 no fue un error, fue una
// decisión de producto previa, ahora revertida tras el hallazgo P0-1 de
// la auditoría P14.4 (canjear una Reward retrocedía visiblemente el
// Goal, sin ningún aviso). El cálculo real vive en `getEarnedPointsTowardGoal()`
// (`./get-earned-points.ts`, testeable directamente, sin `next/headers`)
// — este archivo solo resuelve la sesión real y le pasa `points_at_goal_creation`
// (ya seleccionado de `goals`, rellenado siempre por el trigger `security
// definer` `set_goal_points_at_creation()` desde el origen de la tabla,
// nunca por el cliente) y `created_at` del propio Goal.
export interface ActiveGoal {
  id: string;
  title: string;
  targetPoints: number;
  targetDate?: string;
  createdAt: string;
  // P14.4-E — "Points acumulados ganados hacia este Goal desde su
  // creación" (baseline + earned posterior, excluyendo `redemption_refund`).
  // Ya NO es el mismo número que el saldo de Wallet (`getWalletBalance()`)
  // — pueden divergir deliberadamente en cuanto el usuario canjee algo.
  earnedPoints: number;
  // P14.4-F (F4) — true ÚNICAMENTE en la petición exacta donde este Goal
  // acaba de transicionar a 'completed' (earnedPoints alcanzó
  // targetPoints por primera vez). En cualquier otra petición posterior,
  // este mismo Goal ya no es 'active' y `getActiveGoal()` devuelve
  // `undefined` — nunca vuelve a aparecer aquí, así que este campo nunca
  // puede volver a ser `true` para el mismo Goal (garantizado por el RPC,
  // no por lógica de cliente). Cuando es `true`, `earnedPoints` ya
  // refleja el valor con el que se alcanzó el objetivo — `ActiveGoalCard`
  // lo usa para renderizar la celebración en vez de la barra de progreso
  // normal.
  justCompleted: boolean;
}

// `calculateGoalProgressPercent()` vive en `./calculate-progress.ts`
// (función pura, sin `next/headers`) — nunca aquí, para que un Client
// Component pueda importarla sin arrastrar `createSessionClient` (más
// abajo) a su bundle. Ver el comentario de cabecera de ese archivo.

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
      .select("id, title, target_points, target_date, created_at, points_at_goal_creation")
      .eq("status", "active")
      .maybeSingle();

    if (goalError || !goal) {
      return undefined;
    }

    // P14.4-E — fail-closed: si esta consulta adicional fallara, se
    // trata igual que `goalError` de arriba (todo el bloque vive dentro
    // del mismo try/catch de la función) — nunca se muestra un Goal con
    // un progreso a medias o inventado.
    const earnedPoints = await getEarnedPointsTowardGoal(
      sessionClient,
      user.id,
      goal.created_at as string,
      goal.points_at_goal_creation as number,
    );

    // P14.4-F (F4) — solo se llama al RPC de completion cuando ya hay
    // motivo real para sospechar que se alcanzó el objetivo (evita una
    // llamada extra en la inmensa mayoría de las cargas de página, donde
    // el progreso sigue por debajo). El RPC re-verifica todo de forma
    // autoritativa server-side — este chequeo previo es solo una
    // optimización, nunca la fuente de verdad.
    let justCompleted = false;
    if (earnedPoints >= (goal.target_points as number)) {
      const completion = await completeGoalIfThresholdMet(goal.id as string, user.id);
      justCompleted = completion.justCompleted;
      if (!justCompleted) {
        // O bien sigue realmente activo (no debería ocurrir si el propio
        // RPC coincide con este cálculo, pero no se asume), o ya estaba
        // 'completed'/'cancelled' desde una petición anterior — en
        // cualquiera de los dos casos, ya no hay un Goal 'active' que
        // mostrar como tal: mismo criterio que el resto de esta función,
        // nunca se inventa un estado a medias.
        if (completion.goalStatus !== "active") {
          return undefined;
        }
      }
    }

    return {
      id: goal.id as string,
      title: goal.title as string,
      targetPoints: goal.target_points as number,
      targetDate: (goal.target_date as string | null) ?? undefined,
      createdAt: goal.created_at as string,
      earnedPoints,
      justCompleted,
    };
  } catch {
    return undefined;
  }
}
