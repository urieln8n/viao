"use server";

import { createClient as createSessionClient } from "../../../lib/supabase/server";
import { recordReturnVisitIfApplicable } from "../../../lib/analytics/record-return-visit";

// F12-05 (VIAO_ROADMAP.md) — Envoltura fina que resuelve la sesión real
// (mismo mecanismo de F3-06/F5-05, `lib/supabase/server.ts` +
// `auth.getUser()`) y delega en `recordReturnVisitIfApplicable()`
// (lib/analytics/record-return-visit.ts, sin `next/headers`, testable
// directamente). Se llama SOLO desde el envío real del formulario de
// login tras un `signInWithPassword()` exitoso (app/(auth)/login/page.tsx)
// — nunca desde un efecto de montaje/render, para no generar falsos
// `return_visit` simplemente por cargar la página con una sesión ya
// existente (requisito explícito de F12-05).
//
// Fail-closed y best-effort: sin sesión real, no-op; cualquier fallo se
// registra pero nunca se propaga — un problema de analytics no debe
// romper el login.
export async function recordReturnVisitAction(): Promise<void> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return;
    }

    await recordReturnVisitIfApplicable(user.id);
  } catch (error) {
    console.error("[analytics] Error inesperado registrando return_visit:", error);
  }
}
