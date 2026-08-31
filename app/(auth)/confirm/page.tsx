"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type SessionStatus = "checking" | "invalid";

// Email V2 — destino de emailRedirectTo tras el enlace de confirmación de
// registro (register/page.tsx). Mismo patrón exacto que
// app/(auth)/recover/update/page.tsx: el enlace oficial de Supabase
// redirige aquí con la sesión en el fragmento de la URL
// (#access_token=...&refresh_token=...), que el cliente no detecta
// automáticamente — se parsea y se establece con setSession() (ninguna
// verificación de token propia). Añade sobre ese patrón la lógica de
// UX-17.1: si intent=partner+accessToken están presentes, vuelve al
// Dashboard del Commerce en vez de a /onboarding — mismo criterio que ya
// usan login/page.tsx y register/page.tsx.
function ConfirmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerAccessToken =
    searchParams.get("intent") === "partner" ? searchParams.get("accessToken") : null;

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");

  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSessionStatus("invalid");
        return;
      }

      router.replace(
        partnerAccessToken ? `/partners/dashboard/${partnerAccessToken}` : "/onboarding",
      );
    }

    establishSession();
  }, [partnerAccessToken, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      {sessionStatus === "checking" && <LoadingState message={t("confirm.checking")} />}
      {sessionStatus === "invalid" && <ErrorState message={t("confirm.invalidLink")} />}
    </main>
  );
}

// UX-17.1 — mismo motivo que login/register: useSearchParams() exige un
// límite <Suspense> para no forzar CSR de toda la página durante el
// prerender.
export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmPageContent />
    </Suspense>
  );
}
