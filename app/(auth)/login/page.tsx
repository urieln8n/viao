"use client";

import { Suspense, useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { recordReturnVisitAction } from "./actions";

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

function LoginPageContent() {
  const router = useRouter();
  // UX-17.1 — mismo criterio que register/page.tsx: presencia conjunta de
  // intent=partner + accessToken (nunca guardados fuera de la URL) activa el
  // mecanismo de redirección al Dashboard más abajo. Sin ambos, esta página
  // se comporta exactamente igual que antes de este bloque.
  const searchParams = useSearchParams();
  const partnerAccessToken =
    searchParams.get("intent") === "partner" ? searchParams.get("accessToken") : null;

  const emailId = useId();
  const passwordId = useId();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setSessionStatus(data.user ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setSessionStatus(session?.user ? "signed-in" : "signed-out");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // UX-17.1 — Casos 5 y 6 del plan: un único mecanismo cubre tanto "login
  // recién completado con intención Partner" (signInWithPassword resuelve,
  // el listener de arriba pasa sessionStatus a "signed-in", este efecto
  // dispara) como "sesión ya iniciada al abrir /login?intent=partner&..."
  // (sessionStatus ya es "signed-in" desde el primer getUser()) — ambos son
  // el mismo estado observable, no dos rutas de código separadas. Sin
  // partnerAccessToken, este efecto nunca se dispara: el Usuario normal
  // sigue viendo la pantalla estática "sesión iniciada como X" de siempre.
  useEffect(() => {
    if (sessionStatus === "signed-in" && partnerAccessToken) {
      router.push(`/partners/dashboard/${partnerAccessToken}`);
    }
  }, [sessionStatus, partnerAccessToken, router]);

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
      // onAuthStateChange actualiza sessionStatus/userEmail.

      // F12-05 (VIAO_ROADMAP.md) — solo aquí, tras un signInWithPassword()
      // real y exitoso (nunca en el useEffect de montaje) — best-effort,
      // nunca bloquea ni afecta el resultado del login.
      void recordReturnVisitAction();
    } catch {
      setSubmitError(t("login.errorUnexpected"));
      setStatus("idle");
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLogoutLoading(false);
    // onAuthStateChange actualiza sessionStatus/userEmail.
  }

  const isLoading = status === "loading";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionStatus === "checking" && (
            <LoadingState message={t("login.checkingSession")} />
          )}

          {sessionStatus === "signed-in" && (
            <div className="flex flex-col gap-4">
              <p role="status" className="text-sm">
                {t("login.signedInAs")} {userEmail}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? t("login.loggingOut") : t("login.logoutButton")}
              </Button>
            </div>
          )}

          {sessionStatus === "signed-out" && (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {t("login.emailLabel")}
                </label>
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
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
                  {t("login.passwordLabel")}
                </label>
                <Input
                  id={passwordId}
                  name="password"
                  type="password"
                  autoComplete="current-password"
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

              {/* Bloque 13 ("Pulido final antes del piloto") — navegación
                  Login <-> Register + recuperación de contraseña, ambas
                  rutas ya existentes (F3-01/F3-04), sin ningún flujo
                  nuevo. */}
              <div className="flex flex-col items-center gap-1 text-sm">
                <p className="text-muted-foreground">
                  {t("login.registerPromptText")}{" "}
                  <Link href="/register" className="text-primary underline-offset-4 hover:underline">
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

          {/* UX-17.2 — CTA secundario/discreto, reutiliza las mismas claves
              i18n ya usadas en app/partners/page.tsx (§13/§21). Oculto cuando
              partnerAccessToken existe: alguien que llega vía invitación
              Partner (UX-17.1) ya sabe que "tiene un negocio" — mostrárselo
              sería redundante y rompería el criterio de "posibilidad
              secundaria, no llamada comercial". No interfiere con el
              mecanismo intent=partner/accessToken de arriba. */}
          {!partnerAccessToken && (
            <p className="text-center text-sm text-muted-foreground">
              {t("partners.joinTeaser")}{" "}
              <Link href="/partners/join" className="text-primary underline-offset-4 hover:underline">
                {t("partners.joinTeaserCta")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

// UX-17.1 — mismo motivo que register/page.tsx: useSearchParams() exige un
// límite <Suspense> para no forzar CSR de toda la página durante el
// prerender (confirmado en la documentación de Next.js, no asumido).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
