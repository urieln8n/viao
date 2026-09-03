// P14 (Partner Login) — reducido a un envoltorio fino sobre el componente
// compartido LoginForm (components/auth/login-form.tsx), que ahora
// también usa app/partner/login/page.tsx. Sin cambio de comportamiento
// para el Usuario: mismo título, mismo destino por defecto ("/"), mismo
// teaser "conviértete en Partner" visible.
import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return <LoginForm defaultRedirect="/" title={t("login.title")} showJoinTeaser />;
}
