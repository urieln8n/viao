import { createClient as createSessionClient } from "../supabase/server";

// F7-02 (VIAO_ROADMAP.md) — Lectura del saldo de Points del usuario
// autenticado.
//
// Fuente de verdad: `rewards_transactions` (VIAO_DATABASE.md sección 7).
// `rewards_wallets` (sección 8) es una VIEW `security_invoker = true`
// sobre `SUM(amount) GROUP BY user_id` — no una tabla con un saldo
// editable, así que leer esta vista NUNCA puede divergir del ledger: es
// literalmente la misma suma, calculada en cada consulta, no una copia
// materializada que alguien deba mantener sincronizada.
//
// `security_invoker = true` (verificado empíricamente antes de escribir
// este archivo, con dos usuarios reales: cada uno solo ve su propio
// saldo) hace que la vista herede la RLS de `rewards_transactions`
// (`rewards_transactions_select_own`) usando el rol de quien consulta —
// por eso aquí se usa el cliente de SESIÓN (`lib/supabase/server.ts`),
// nunca `service_role`: el propio usuario autenticado ya tiene acceso de
// lectura a su fila, un privilegio más amplio sería innecesario.
//
// Sin fila para ese `user_id`: la vista, al ser un `GROUP BY`, no emite
// ninguna fila para un usuario sin transacciones — se distingue
// explícitamente de "sin acceso" (ver más abajo): `0` es el saldo real de
// un usuario nuevo, no un error.
export async function getWalletBalance(): Promise<number | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("rewards_wallets")
      .select("balance")
      .maybeSingle();

    if (error) {
      // Sin sesión real (RLS/GRANT lo impide para anon) o fallo técnico:
      // se distingue de "0 transacciones" devolviendo `undefined`, nunca
      // se muestra un saldo inventado.
      return undefined;
    }

    return data?.balance ?? 0;
  } catch {
    return undefined;
  }
}
