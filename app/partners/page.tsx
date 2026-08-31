import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/state/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { getActivePartners } from "../../lib/partners/get-active-partners";
import { PartnerCard } from "./partner-card";

// UX-10 (Partners Visible + Discovery + Registration) — §6: superficie
// pública mínima de Discovery. Nunca requiere sesión (mismo criterio que
// `/rewards` catalog no exige sesión para mostrarse — aquí ni siquiera
// hace falta esa distinción: `getActivePartners()` no depende de
// `next/headers`, solo de service_role, así que la página es
// enteramente estática por request). Solo `status = 'active'` y
// `is_test = false` — nunca `pending`/`inactive`/fixtures de test.
export default async function PartnersPage() {
  const partners = await getActivePartners();

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="wide" className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("partners.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("partners.pageSubtitle")}</p>
        </div>

        {partners.length === 0 ? (
          <EmptyState title={t("partners.emptyTitle")} message={t("partners.emptyMessage")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}

        {/* §13/§21 — CTA de negocio, deliberadamente solo aquí (nunca en
            Home ni en la navegación principal): quien ya está viendo
            Discovery es la audiencia correcta para "¿tienes un negocio?",
            sin añadir una card más a Home. */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          <span className="text-sm text-muted-foreground">{t("partners.joinTeaser")}</span>
          <Link
            href="/partners/join"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1" })}
          >
            {t("partners.joinTeaserCta")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
