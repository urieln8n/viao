// P14 (Partner Login) — puerta de entrada explícita del Partner Portal.
// Misma identidad Supabase Auth que /login (LoginForm compartido,
// components/auth/login-form.tsx) — solo cambia el encabezado y el
// destino por defecto tras autenticarse (/partners/dashboard, Camino B
// existente). Autenticarse aquí NUNCA concede acceso Partner por sí
// mismo: /partners/dashboard sigue resolviendo owner_id vía
// resolveOwnedPartners() exactamente igual que antes de este bloque — un
// usuario VIAO normal que entra por esta puerta ve el mismo EmptyState
// "sin negocios" que ya existía, no un dashboard.
import { CommerceChrome } from "@/components/layout/commerce-chrome";
import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/lib/i18n";

export default function PartnerLoginPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommerceChrome />
      <LoginForm
        defaultRedirect="/partners/dashboard"
        title={t("partnerLogin.title")}
        subtitle={t("partnerLogin.subtitle")}
        showJoinTeaser={false}
      />
    </div>
  );
}
