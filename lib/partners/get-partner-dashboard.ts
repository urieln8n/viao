import { createServiceRoleClient } from "../supabase/service";

// Bloque Partners PB6 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Dashboard
// Beta (PMM6, LOCKED). Exactamente las 6 métricas de
// VIAO_PARTNERS_TECHNICAL_SPEC.md §14-15, calculadas en una única consulta
// de solo lectura sobre `partner_activities` (índice `partner_id` de
// PB1) — sin tabla `partner_metrics`, sin agregación persistida, sin
// tocar `rewards_transactions`/`rewards_wallets` (el Dashboard refleja la
// Actividad económica declarada, no el ledger de Points).
//
// **Interpretación explícita de "período consultado"** (Technical Spec
// §14): ningún documento LOCKED fija un período concreto (7/30/90 días,
// mes en curso, etc.) para `clientes_nuevos`/`clientes_recurrentes`, y
// PB6 prohíbe introducir un selector de fechas por iniciativa propia. La
// única lectura que no inventa un filtro nuevo es tratar "el período
// consultado" como el histórico completo del Partner (coherente con una
// Beta de 6-8 semanas, L4 — el propio Beta funciona como un único
// período). Bajo esta lectura, `clientes_nuevos` = usuarios distintos con
// al menos 1 Actividad histórica con este Partner; `clientes_recurrentes`
// = el subconjunto de esos con ≥2 Actividades — ambas cifras siguen la
// definición canónica de Master V2 §7 sin reinterpretarla, solo sin
// acotar por fecha.
//
// `points_awarded=0` (P5) NO se excluye de ningún cálculo: la Actividad
// cuenta igual para clientes_nuevos/recurrentes/ventas/actividad
// reciente/partner_activo — el Dashboard refleja `partner_activities`
// (lo que ocurrió), no el ledger de Points (lo que se otorgó).
//
// No se muestra `user_id` en `actividad_reciente`: ningún documento
// LOCKED autoriza exponer al Partner la identidad de un usuario
// específico de VIAO — las únicas superficies de "cliente" ya
// documentadas son agregados (clientes_nuevos/recurrentes), nunca una
// lista nominal.
const RECENT_ACTIVITY_LIMIT = 10;
const PARTNER_ACTIVE_WINDOW_DAYS = 14;

export interface PartnerActivitySummary {
  createdAt: string;
  attributionMechanism: "qr" | "reservation";
  amountConfidence: "declared" | "confirmed_by_reservation";
  declaredAmountEur: number;
  pointsAwarded: number;
}

export interface PartnerDashboardData {
  clientesNuevos: number;
  clientesRecurrentes: number;
  ventasDeclaradasEur: number;
  ventasConfirmadasReservaEur: number;
  actividadReciente: PartnerActivitySummary[];
  partnerActivo: boolean;
}

export async function getPartnerDashboard(partnerId: string): Promise<PartnerDashboardData> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partner_activities")
    .select("user_id, created_at, attribution_mechanism, amount_confidence, declared_amount_eur, points_awarded")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudo calcular el dashboard del Partner: ${error.message}`);
  }

  const rows = data ?? [];

  const activityCountByUser = new Map<string, number>();
  let ventasDeclaradasEur = 0;
  let ventasConfirmadasReservaEur = 0;

  for (const row of rows) {
    const userId = row.user_id as string;
    activityCountByUser.set(userId, (activityCountByUser.get(userId) ?? 0) + 1);

    const amount = Number(row.declared_amount_eur);
    if (row.amount_confidence === "declared") {
      ventasDeclaradasEur += amount;
    } else if (row.amount_confidence === "confirmed_by_reservation") {
      ventasConfirmadasReservaEur += amount;
    }
  }

  const clientesNuevos = activityCountByUser.size;
  const clientesRecurrentes = [...activityCountByUser.values()].filter((count) => count >= 2).length;

  const activeThreshold = new Date();
  activeThreshold.setUTCDate(activeThreshold.getUTCDate() - PARTNER_ACTIVE_WINDOW_DAYS);
  const partnerActivo = rows.some((row) => new Date(row.created_at as string) >= activeThreshold);

  const actividadReciente: PartnerActivitySummary[] = rows.slice(0, RECENT_ACTIVITY_LIMIT).map((row) => ({
    createdAt: row.created_at as string,
    attributionMechanism: row.attribution_mechanism as "qr" | "reservation",
    amountConfidence: row.amount_confidence as "declared" | "confirmed_by_reservation",
    declaredAmountEur: Number(row.declared_amount_eur),
    pointsAwarded: row.points_awarded as number,
  }));

  return {
    clientesNuevos,
    clientesRecurrentes,
    ventasDeclaradasEur,
    ventasConfirmadasReservaEur,
    actividadReciente,
    partnerActivo,
  };
}
