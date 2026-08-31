import type { ReactNode } from "react";

import { CommerceChrome } from "@/components/layout/commerce-chrome";

import { resolvePartnerAccess } from "../../../../lib/partners/resolve-partner-access";

// UX-16.6 (Commerce UX Pro Max) — reutiliza `resolvePartnerAccess()` TAL
// CUAL (mismo criterio ya aplicado en get-partner-for-editing.ts): esta
// es una SEGUNDA llamada independiente de la que ya hace page.tsx, no una
// nueva función de resolución. Si el token no es válido/activo,
// `businessName` queda `undefined` y CommerceChrome usa su fallback i18n
// — el propio page.tsx sigue siendo quien decide `notFound()` en ese
// caso, este layout nunca bloquea ni redirige.
interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ accessToken: string }>;
}

export default async function PartnerDashboardLayout({ children, params }: DashboardLayoutProps) {
  const { accessToken } = await params;
  const access = await resolvePartnerAccess(accessToken);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommerceChrome businessName={access.status === "granted" ? access.partner.name : undefined} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
