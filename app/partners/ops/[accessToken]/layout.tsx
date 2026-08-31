import type { ReactNode } from "react";

import { CommerceChrome } from "@/components/layout/commerce-chrome";

import { resolvePartnerAccess } from "../../../../lib/partners/resolve-partner-access";

// UX-16.6 (Commerce UX Pro Max) — mismo patrón exacto que
// app/partners/dashboard/[accessToken]/layout.tsx: reutiliza
// `resolvePartnerAccess()` sin duplicar lógica, nunca bloquea/redirige
// (eso lo sigue decidiendo page.tsx).
interface OpsLayoutProps {
  children: ReactNode;
  params: Promise<{ accessToken: string }>;
}

export default async function PartnerOpsLayout({ children, params }: OpsLayoutProps) {
  const { accessToken } = await params;
  const access = await resolvePartnerAccess(accessToken);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommerceChrome businessName={access.status === "granted" ? access.partner.name : undefined} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
