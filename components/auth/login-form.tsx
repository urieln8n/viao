"use client";

// P14 (Partner Login) — extraído de app/(auth)/login/page.tsx
// (LoginPageContent original) para que /login y /partner/login compartan
// una única fuente de verdad de autenticación: mismo
// supabase.auth.signInWithPassword(), mismo mecanismo de resolución de
// sesión, misma protección anti open-redirect. Lo único que varía por
// variante es superficial — título, subtítulo, destino por defecto tras
// login, y si se muestra el teaser "conviértete en Partner" (no tiene
// sentido mostrarlo a alguien que ya está en el propio Partner Portal).
// La autorización real (quién obtiene acceso a qué Partner) nunca vive
// aquí — sigue dependiendo enteramente de owner_id/RLS/RPCs existentes,
// resueltos server-side por la página de destino.
import { Suspense, useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { sanitizeReturnTo, resolveLoginRedirectTarget } from "@/lib/auth/resolve-login-redirect";
import { recordReturnVisitAction } from "@/app/(auth)/login/actions";

type SubmitStatus = "idle" | "loading";
type SessionStatus = "checking" | "signed-out" | "signed-in";

// Mapeo basado en `error.code` (mismo patrón que F3-01), verificado
// empíricamente contra Supabase Auth: "invalid_credentials" es el código real
// devuelto por signInWithPassword() ante email/contraseña incorrectos.
function mapSignInError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return t("login.errorInvalidCredentials");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return t("login.errorRateLimited");
    default:
      return t("login.errorUnexpected");
  }
}

export interface LoginFormProps {
  /** "/" para el login de Usuario, "/partners/dashboard" para el de Partner — nunca derivado de la petición. */
  defaultRedirect: string;
  title: string;
  subtitle?: string;
  /** El teaser "¿tienes un negocio? Regístralo" solo tiene sentido fuera del propio Partner Portal. */
  showJoinTeaser: boolean;
}

function LoginFormContent({ defaultRedirect, title, subtitle, showJoinTeaser }: LoginFormProps) {
  const router = useRouter();
  // UX-17.1 — mismo criterio que register/page.tsx: presencia conjunta de
  // intent=partner + accessToken (nunca guardados fuera de la URL) activa el
  // mecanismo de redirección al Dashboard más abajo, en las dos variantes.
  const searchParams = useSearchParams();
  const partnerAccessToken =
    searchParams.get("intent") === "partner" ? searchParams.get("accessToken") : null;
  // UX-AUTH-1 (Decision Lock, §2/§3) — mismo criterio de origen que
  // partnerAccessToken (leído directamente de la URL, nunca guardado en
  // estado/localStorage/cookies). Sanitizado antes de cualquier uso.
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const redirectTarget = resolveLoginRedirectTarget({ partnerAccessToken, returnTo, defaultRedirect });

  // P9.1 — hallazgo de la auditoría visual: en la variante Partner
  // (showJoinTeaser=false, /partner/login) este mismo enlace llevaba a
  // /register (alta de Usuario) en vez de /partners/join (solicitar ser
  // Partner) — showJoinTeaser ya distingue exactamente esta misma
  // variante en el resto del formulario (línea de abajo), así que se
  // reutiliza aquí en vez de añadir un prop nuevo solo para esto. El
  // flujo de registro de Usuario en sí (/register) no se toca.
  const registerHref = showJoinTeaser ? "/register" : "/partners/join";

  const emailId = useId();
  const passwordId = useId();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // UX-AUTH-1 (Decision Lock, §2/§3/§F) — un único mecanismo resuelve el
  // destino con la prioridad ya fijada: intent=partner > returnTo válido
  // > defaultRedirect de la variante. Cubre tanto "login recién
  // completado" (signInWithPassword resuelve, el listener de arriba pasa
  // sessionStatus a "signed-in", este efecto dispara) como "sesión ya
  // existente al abrir la página" (sessionStatus ya es "signed-in" desde
  // el primer getUser()) — mismo estado observable, no dos rutas de
  // código separadas.
  useEffect(() => {
    if (sessionStatus !== "signed-in") return;
    router.push(redirectTarget);
  }, [sessionStatus, redirectTarget, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? t("login.validationEmailRequired")
      : null;
    const nextPasswordError = !password
      ? t("login.validationPasswordRequired")
      : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setStatus("loading");
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setSubmitError(mapSignInError(error));
        setStatus("idle");
        return;
      }

      setPassword("");
      setStatus("idle");
      // onAuthStateChange actualiza sessionStatus, lo que dispara el
      // useEffect de arriba y redirige al destino resuelto.

      // F12-05 (VIAO_ROADMAP.md) — solo aquí, tras un signInWithPassword()
      // real y exitoso (nunca en el useEffect de montaje) — best-effort,
      // nunca bloquea ni afecta el resultado del login. Mismo evento de
      // cuenta en las dos variantes: es un Mission a nivel de identidad
      // ("volviste"), no algo que dependa de si entraste por /login o
      // /partner/login.
      void recordReturnVisitAction();
    } catch {
      setSubmitError(t("login.errorUnexpected"));
      setStatus("idle");
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionStatus === "checking" && (
            <LoadingState message={t("login.checkingSession")} />
          )}

          {sessionStatus === "signed-in" && (
            <LoadingState message={t("login.redirecting")} />
          )}

          {sessionStatus === "signed-out" && (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {t("login.emailLabel")} <span aria-hidden="true">*</span>
                </label>
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? `${emailId}-error` : undefined}
                />
                {emailError && (
                  <p id={`${emailId}-error`} className="text-sm text-destructive">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={passwordId} className="text-sm font-medium">
                  {t("login.passwordLabel")} <span aria-hidden="true">*</span>
                </label>
                <PasswordInput
                  id={passwordId}
                  name="password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                />
                {passwordError && (
                  <p id={`${passwordId}-error`} className="text-sm text-destructive">
                    {passwordError}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("login.submitButtonLoading")
                  : t("login.submitButton")}
              </Button>

              <div className="flex flex-col items-center gap-1 text-sm">
                <p className="text-muted-foreground">
                  {t("login.registerPromptText")}{" "}
                  <Link href={registerHref} className="text-primary underline-offset-4 hover:underline">
                    {t("login.registerPromptLink")}
                  </Link>
                </p>
                <Link
                  href="/recover"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t("login.forgotPasswordLink")}
                </Link>
              </div>
            </form>
          )}

          {status === "loading" && (
            <LoadingState message={t("login.submitButtonLoading")} />
          )}
          {submitError && <ErrorState message={submitError} />}

          {/* UX-17.2, extendido en P9.1 — sección secundaria de Partners,
              oculta tanto cuando llega vía invitación Partner
              (partnerAccessToken) como en la propia variante Partner
              (showJoinTeaser=false): quien ya está en el Partner Portal ya
              sabe que tiene un negocio. Hallazgo de la auditoría visual
              P9: antes solo existía el enlace de "conviértete en Partner"
              (texto plano, jerarquía mínima) — sin ningún acceso visible
              para quien YA es Partner y solo quiere iniciar sesión. Ahora
              son 2 botones secundarios (outline, mismo patrón que
              LinkAccountWidget) bajo un único encabezado compartido,
              diferenciando explícitamente las 2 situaciones posibles. */}
          {showJoinTeaser && !partnerAccessToken && (
            <div className="flex flex-col items-center gap-2 border-t pt-4 text-center">
              <p className="text-sm text-muted-foreground">{t("partners.joinTeaser")}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/partner/login"
                  className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}
                >
                  {t("partners.existingPartnerLoginCta")}
                </Link>
                <Link
                  href="/partners/join"
                  className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}
                >
                  {t("partners.joinTeaserCta")}
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

// UX-17.1 — mismo motivo que register/page.tsx: useSearchParams() exige un
// límite <Suspense> para no forzar CSR de toda la página durante el
// prerender (confirmado en la documentación de Next.js, no asumido).
export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense fallback={null}>
      <LoginFormContent {...props} />
    </Suspense>
  );
}
