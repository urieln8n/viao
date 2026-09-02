import { redirect } from "next/navigation";

import { createClient as createSessionClient } from "../../lib/supabase/server";
import { OnboardingView } from "./onboarding-view";

// UX-AUTH-1 (Decision Lock, §G) — guard de sesión, mismo patrón exacto
// que app/partners/dashboard/page.tsx (Camino B): Server Component que
// resuelve `auth.getUser()` y redirige a /login si no hay sesión.
// /onboarding solo tiene sentido con una sesión real (el Paso 2 crea un
// Goal ligado a auth.uid()) — antes de este bloque, un usuario sin
// sesión veía el mismo formulario, que fallaría silenciosamente al no
// tener auth.uid() (hallazgo P2 de la auditoría UX-AUTH). No se toca
// Supabase Auth ni el middleware global — el guard vive aquí, igual que
// en el resto de Partners.
export default async function OnboardingPage() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <OnboardingView />;
}
