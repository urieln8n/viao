"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

import { linkPartnerOwnerAction } from "./actions";

type SessionStatus = "checking" | "signed-out" | "signed-in";
type LinkStatus = "idle" | "linking" | "error";

// UX-16.3 (Commerce Identity) — único widget interactivo que este bloque
// añade al Dashboard. Solo se renderiza cuando `ownerLinked === false`
// (partner-dashboard-view.tsx); toda la lógica de seguridad vive en el
// RPC `link_partner_owner()` (SECURITY DEFINER) — este componente solo
// resuelve la sesión del navegador y muestra el resultado, nunca decide
// por sí mismo si la vinculación es válida.
export function LinkAccountWidget({ accessToken }: { accessToken: string }) {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("idle");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setSessionStatus(data.user ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionStatus(session?.user ? "signed-in" : "signed-out");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLink() {
    setLinkStatus("linking");
    const result = await linkPartnerOwnerAction(accessToken);
    if (result.outcome === "linked") {
      // Recarga el Server Component (page.tsx) para que `ownerLinked`
      // pase a true y este widget deje de renderizarse — sin duplicar
      // aquí ningún estado que ya vive en el servidor.
      router.refresh();
      return;
    }
    setLinkStatus("error");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("partnerDashboard.linkAccountTitle")}</CardTitle>
        <CardDescription>{t("partnerDashboard.linkAccountDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sessionStatus === "signed-out" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{t("partnerDashboard.linkAccountSignInPrompt")}</p>
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
              {t("partnerDashboard.linkAccountSignInCta")}
            </Link>
          </div>
        )}

        {sessionStatus === "signed-in" && (
          <Button
            type="button"
            onClick={handleLink}
            disabled={linkStatus === "linking"}
            className="w-fit"
          >
            {linkStatus === "linking" ? t("partnerDashboard.linkAccountLoading") : t("partnerDashboard.linkAccountCta")}
          </Button>
        )}

        {linkStatus === "error" && <ErrorState message={t("partnerDashboard.linkAccountError")} />}
      </CardContent>
    </Card>
  );
}
