import { createClient as createSessionClient } from "../supabase/server";

// F10-00 (VIAO_ROADMAP.md) — Comprobación server-side de consentimiento.
// "El servidor debe ser la autoridad final. No confiar únicamente en un
// booleano enviado por el cliente" — esta función nunca recibe el estado
// de consentimiento como parámetro, siempre lo relee de `vision_consents`
// server-side, usando el cliente de sesión (mismo mecanismo de F3-06:
// `auth.getUser()` vía cookies) para que RLS (`vision_consents_select_own`)
// ya filtre automáticamente al usuario autenticado — nunca hace falta
// pasarle un `userId` ni comprobarlo aparte.
//
// Consentimiento "activo" = la fila más reciente del usuario tiene
// `action = 'granted'`. Sin filas, o última fila `withdrawn` -> no hay
// consentimiento activo. Fuera de una petición real de Next.js (mismo
// criterio de resiliencia que getSearchById/F6-01): `createSessionClient()`
// lanza, se captura y se trata como "sin consentimiento" (fail-closed,
// nunca se asume consentimiento por defecto).
export async function hasActiveVisionConsent(): Promise<boolean> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("vision_consents")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return false;
    }
    return data.action === "granted";
  } catch {
    return false;
  }
}
