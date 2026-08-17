"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

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

export default function LoginPage() {
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
            </form>
          )}

          {status === "loading" && (
            <LoadingState message={t("login.submitButtonLoading")} />
          )}
          {submitError && <ErrorState message={submitError} />}
        </CardContent>
      </Card>
    </main>
  );
}
