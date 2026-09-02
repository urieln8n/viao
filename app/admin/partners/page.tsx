import { redirect, notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { createClient as createSessionClient } from "../../../lib/supabase/server";
import { getPartnersForAdmin, isPartnerAdmin } from "../../../lib/partners/get-partners-for-admin";
import { AdminPartnersView } from "./admin-partners-view";

// P10 (Admin Partners V1) — única superficie de invocación de
// set_partner_status() con conocimiento no técnico (hasta este bloque,
// el único procedimiento real era una llamada REST manual autenticada,
// ver VIAO_PARTNERS_CONTINUITY_MASTER.md §19.1). Guard server-side en dos
// pasos, mismo criterio ya establecido en todo el dominio Partners:
//   1. sin sesión -> redirect("/login"), mismo patrón exacto que
//      app/partners/dashboard/page.tsx (Camino B de Commerce Identity).
//   2. con sesión pero sin partner_admin -> notFound(), mismo criterio
//      anti-enumeración que resolvePartnerAccess()/link_partner_owner()
//      ya aplican en todo Partners: un usuario sin autorización no debe
//      poder distinguir "esta ruta no existe" de "existe pero no tienes
//      acceso" (a diferencia de un redirect a "/", que sí confirmaría
//      que la ruta existe y está protegida).
// Esto es SOLO UX — la autoridad real sigue siendo exclusivamente
// set_partner_status() (auth.uid() + raw_app_meta_data dentro del propio
// RPC, ver admin-actions.ts): si alguien se saltara este guard, cada
// acción de la pantalla seguiría siendo rechazada por el RPC.
export default async function AdminPartnersPage() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isPartnerAdmin(user)) {
    notFound();
  }

  const partners = await getPartnersForAdmin();

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{t("adminPartners.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminPartners.pageDescription")}</p>
        </div>
        <AdminPartnersView partners={partners} />
      </PageContainer>
    </main>
  );
}
