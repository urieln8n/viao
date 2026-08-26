import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";

import { resolvePartnerAccess } from "../../../../lib/partners/resolve-partner-access";
import { PartnerOpsView } from "./partner-ops-view";

// Bloque Partners PB5 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — página de
// operación del Partner, ruta ilustrativa ya prevista por el Technical
// Spec §11.4 (`/partners/ops/<access_token>`). Mismo patrón que
// app/properties/[id]/page.tsx: Server Component que resuelve el
// identificador de ruta mediante una función testable de `lib/`
// (`resolvePartnerAccess`, PB3) y llama a `notFound()` si no es válido —
// un token inexistente, mal formado o de un Partner `inactive` recibe
// exactamente el mismo 404 genérico del proyecto (PB3 ya decide no
// distinguir el motivo al llamante).
//
// No requiere sesión de VIAO para RENDERIZAR (el contexto del Partner es
// público una vez se conoce el token, igual que la mini-web) — la sesión
// real solo se exige al confirmar una Actividad, dentro de
// registerQrActivityAction()/registerReservationActivityAction() (PB4).
interface PartnerOpsPageProps {
  params: Promise<{ accessToken: string }>;
}

export default async function PartnerOpsPage({ params }: PartnerOpsPageProps) {
  const { accessToken } = await params;
  const access = await resolvePartnerAccess(accessToken);

  if (access.status !== "granted") {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="narrow" className="flex flex-1 flex-col gap-4 p-6">
        <PartnerOpsView partner={access.partner} accessToken={accessToken} />
      </PageContainer>
    </main>
  );
}
