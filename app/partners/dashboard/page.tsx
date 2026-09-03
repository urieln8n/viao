import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/state/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { createClient as createSessionClient } from "../../../lib/supabase/server";
import { resolveOwnedPartners } from "../../../lib/partners/resolve-partner-access";

// UX-16.3 (Commerce Identity) — "Camino B": punto de entrada para un
// Commerce YA vinculado que llega desde /profile ("Gestionar mi
// negocio"), sin necesitar conocer/pegar su access_token. No sustituye
// ni modifica /partners/dashboard/[accessToken] (Camino A, sin cambios):
// solo resuelve, vía sesión real, a qué access_token(s) redirigir —
// un Partner sin vincular sigue entrando exclusivamente por su enlace
// existente, sin verse afectado por esta ruta nueva.
export default async function PartnerDashboardEntryPage() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  // P14 (Partner Login) — antes redirigía a /login (genérico). Ahora que
  // existe una puerta de entrada propia del Partner Portal, alguien que
  // llega aquí sin sesión (enlace guardado, "Gestionar mi negocio" desde
  // /profile) vuelve a un contexto coherente en vez del login genérico.
  // Sin ningún cambio de autorización: sigue siendo exactamente el mismo
  // getUser() + resolveOwnedPartners() de siempre.
  if (!user) {
    redirect("/partner/login");
  }

  const ownedPartners = await resolveOwnedPartners(user.id);

  if (ownedPartners.length === 1) {
    redirect(`/partners/dashboard/${ownedPartners[0].accessToken}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        {ownedPartners.length === 0 ? (
          <EmptyState
            title={t("partnerDashboard.noOwnedPartnersTitle")}
            message={t("partnerDashboard.noOwnedPartnersMessage")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{t("partnerDashboard.chooseCommerceTitle")}</h1>
            <div className="flex flex-col gap-2">
              {ownedPartners.map((partner) => (
                <Link
                  key={partner.id}
                  href={`/partners/dashboard/${partner.accessToken}`}
                  className={buttonVariants({ variant: "outline", className: "justify-start" })}
                >
                  {partner.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </main>
  );
}
