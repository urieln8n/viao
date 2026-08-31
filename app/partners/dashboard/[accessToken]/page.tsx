import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";

import { resolvePartnerAccess, isPartnerOwnerLinked } from "../../../../lib/partners/resolve-partner-access";
import { getPartnerDashboard } from "../../../../lib/partners/get-partner-dashboard";
import { getPartnerForEditing } from "../../../../lib/partners/get-partner-for-editing";
import { PartnerDashboardView } from "./partner-dashboard-view";

// Bloque Partners PB6 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — panel de
// solo lectura del Partner (PMM6, LOCKED). Mismo patrón que
// app/partners/ops/[accessToken]/page.tsx (PB5): Server Component que
// resuelve el access_token vía resolvePartnerAccess() (PB3) y llama a
// notFound() si no es válido — ruta separada de /partners/ops/[...] a
// propósito (P7 describe explícitamente dos capacidades distintas bajo el
// mismo token: confirmar Actividades, y consultar el panel de solo
// lectura).
interface PartnerDashboardPageProps {
  params: Promise<{ accessToken: string }>;
}

export default async function PartnerDashboardPage({ params }: PartnerDashboardPageProps) {
  const { accessToken } = await params;
  const access = await resolvePartnerAccess(accessToken);

  if (access.status !== "granted") {
    notFound();
  }

  const dashboard = await getPartnerDashboard(access.partner.id);

  // UX-12 (Partner Self-Service C1) — segunda consulta independiente de
  // resolvePartnerAccess() de arriba (ver get-partner-for-editing.ts):
  // en la práctica siempre resuelve si `access` ya fue "granted", pero se
  // trata la ausencia igual que un access_token inválido (notFound())
  // en vez de asumir que nunca puede pasar.
  const editableProfile = await getPartnerForEditing(accessToken);
  if (!editableProfile) {
    notFound();
  }

  // UX-16.3 (Commerce Identity) — el Dashboard sigue siendo alcanzable
  // por access_token exactamente igual que antes (Camino A, sin cambios
  // de autorización); esto solo decide qué widget mostrar (vincular vs.
  // ya vinculado), nunca condiciona el acceso en sí.
  const ownerLinked = await isPartnerOwnerLinked(access.partner.id);

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        <PartnerDashboardView
          partner={access.partner}
          accessToken={accessToken}
          dashboard={dashboard}
          editableProfile={editableProfile}
          ownerLinked={ownerLinked}
        />
      </PageContainer>
    </main>
  );
}
