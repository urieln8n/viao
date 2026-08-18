import { createServiceRoleClient } from "../supabase/service";

// F7-01 (VIAO_ROADMAP.md) — Único punto responsable de crear filas en
// `rewards_transactions` (VIAO_DATABASE.md sección 7). Ningún otro archivo
// del proyecto debe insertar directamente en esta tabla.
//
// RLS/GRANT (Patrón B, auditado antes de escribir este archivo):
// `rewards_transactions` no concede ningún INSERT/UPDATE/DELETE a
// `authenticated`/`anon` — "nunca desde el cliente, bajo ninguna
// circunstancia". `service_role` tampoco tenía ningún GRANT (mismo vacío
// ya descubierto en F5-05/F6-02/F6-03); corregido en
// supabase/migrations/20260818110000_grant_service_role_rewards_transactions.sql
// (SELECT + INSERT únicamente — sin UPDATE ni DELETE: el ledger es
// append-only por diseño explícito de esta fase).
//
// Solo `type: "earned"` (`amount > 0`): F7 no implementa ningún mecanismo
// de gasto/canje todavía — aceptar `type`/`amount` negativo sin ningún
// caso de uso real que lo ejercite sería inventar una capacidad no pedida.
// El `CHECK (type='earned' AND amount>0) OR (type='spent' AND amount<0)`
// de la tabla ya impediría un valor incoherente de todos modos.
//
// Idempotencia (F7, "punto CRÍTICO"): dos formas de uso.
// - CON referencia (`referenceType`+`referenceId`, p. ej. una reserva
//   confirmada): se apoya en la constraint real
//   `rewards_transactions_reference_reason_unique`
//   (UNIQUE (reason, reference_type, reference_id), migración
//   20260818100000_*.sql) mediante `upsert(..., {ignoreDuplicates: true})`
//   — genera `ON CONFLICT (...) DO NOTHING`, nunca un UPDATE (coherente
//   con el GRANT: `service_role` no tiene privilegio de UPDATE). Si la
//   fila ya existía, no devuelve datos (comportamiento de PostgREST con
//   `resolution=ignore-duplicates`), así que se hace una lectura de
//   recuperación para devolver el id existente de forma auditable — nunca
//   se oculta que se trataba de un duplicado (`created: false`).
// - SIN referencia (p. ej. `reason: "registration"`): en producción ese
//   caso real NUNCA pasa por esta función — se otorga desde el trigger
//   `handle_new_user()` (ver `lib/rewards/rules.ts` y la migración
//   20260818120000_*.sql), el único punto server-side realmente fiable
//   para el registro (no existe ninguna Server Action de registro). Esta
//   rama existe para que la función siga siendo genérica/testable para
//   cualquier futuro caso "sin referencia", pero NO lleva protección de
//   idempotencia propia: quien la invoque así es responsable de no
//   llamarla más de una vez para el mismo evento.
export interface CreateRewardTransactionInput {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}

export interface CreateRewardTransactionResult {
  id: string;
  /** `false` cuando ya existía una transacción idéntica (mismo `reason`+`referenceType`+`referenceId`) y no se creó una nueva. */
  created: boolean;
}

export async function createRewardTransaction({
  userId,
  amount,
  reason,
  referenceType,
  referenceId,
}: CreateRewardTransactionInput): Promise<CreateRewardTransactionResult> {
  if (!(amount > 0)) {
    throw new Error(
      "createRewardTransaction: amount debe ser positivo (type='earned') — F7 no implementa gasto/canje de Points todavía.",
    );
  }
  if (Boolean(referenceType) !== Boolean(referenceId)) {
    throw new Error(
      "createRewardTransaction: referenceType y referenceId deben proporcionarse juntos, o ninguno de los dos.",
    );
  }

  const service = createServiceRoleClient();

  if (referenceType && referenceId) {
    const { data, error } = await service
      .from("rewards_transactions")
      .upsert(
        {
          user_id: userId,
          amount,
          type: "earned",
          reason,
          reference_type: referenceType,
          reference_id: referenceId,
        },
        { onConflict: "reason,reference_type,reference_id", ignoreDuplicates: true },
      )
      .select("id");

    if (error) {
      throw new Error(`No se pudo crear la transacción de recompensa: ${error.message}`);
    }
    if (data && data.length > 0) {
      return { id: data[0].id as string, created: true };
    }

    // Conflicto ignorado: ya existía. Se recupera su id para devolverlo
    // igualmente (auditable), nunca se oculta el resultado.
    const { data: existing, error: existingError } = await service
      .from("rewards_transactions")
      .select("id")
      .eq("reason", reason)
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .single();

    if (existingError || !existing) {
      throw new Error(
        `No se pudo recuperar la transacción de recompensa ya existente: ${existingError?.message ?? "sin datos"}`,
      );
    }
    return { id: existing.id as string, created: false };
  }

  const { data, error } = await service
    .from("rewards_transactions")
    .insert({ user_id: userId, amount, type: "earned", reason })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`No se pudo crear la transacción de recompensa: ${error?.message ?? "sin datos"}`);
  }
  return { id: data.id as string, created: true };
}
