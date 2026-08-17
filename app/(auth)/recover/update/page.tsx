"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

// F3-04 (VIAO_ROADMAP.md) — completa el flujo oficial de recuperación de
// Supabase Auth: el enlace del email (F3-04, app/(auth)/recover/) establece
// aquí una sesión real (gestionada por Supabase, `detectSessionInUrl`), que
// es la única autorización necesaria para llamar a `updateUser({password})`.
// No se maneja ningún token manualmente.
const MIN_PASSWORD_LENGTH = 6;

type SessionStatus = "checking" | "invalid" | "valid";
type SubmitStatus = "idle" | "loading" | "success";

function mapUpdatePasswordError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "weak_password":
      return t("recoverUpdate.errorWeakPassword");
    case "same_password":
      return t("recoverUpdate.errorSamePassword");
    default:
      return t("recoverUpdate.errorUnexpected");
  }
}

export default function RecoverUpdatePage() {
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function establishRecoverySession() {
      // El enlace oficial de recuperación de Supabase redirige aquí con la
      // sesión en el fragmento de la URL (#access_token=...&refresh_token=...).
      // El cliente no lo detecta automáticamente, así que se parsea y se
      // establece con la API oficial `setSession` (ningún token propio).
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getUser();
      setSessionStatus(data.user ? "valid" : "invalid");
    }

    establishRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionStatus(session?.user ? "valid" : "invalid");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPasswordError = !password
      ? t("recoverUpdate.validationPasswordRequired")
      : password.length < MIN_PASSWORD_LENGTH
        ? t("recoverUpdate.validationPasswordLength")
        : null;
    const nextConfirmPasswordError =
      !nextPasswordError && password !== confirmPassword
        ? t("recoverUpdate.validationPasswordMismatch")
        : null;

    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);

    if (nextPasswordError || nextConfirmPasswordError) {
      return;
    }

    setStatus("loading");
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setSubmitError(mapUpdatePasswordError(error));
        setStatus("idle");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setStatus("success");
    } catch {
      setSubmitError(t("recoverUpdate.errorUnexpected"));
      setStatus("idle");
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("recoverUpdate.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionStatus === "checking" && (
            <LoadingState message={t("recoverUpdate.checkingSession")} />
          )}

          {sessionStatus === "invalid" && (
            <ErrorState message={t("recoverUpdate.invalidLink")} />
          )}

          {sessionStatus === "valid" &&
            (status === "success" ? (
              <p role="status" className="text-sm">
                {t("recoverUpdate.successMessage")}
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={passwordId} className="text-sm font-medium">
                    {t("recoverUpdate.passwordLabel")}
                  </label>
                  <Input
                    id={passwordId}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby={
                      passwordError ? `${passwordId}-error` : undefined
                    }
                  />
                  {passwordError && (
                    <p id={`${passwordId}-error`} className="text-sm text-destructive">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={confirmPasswordId} className="text-sm font-medium">
                    {t("recoverUpdate.confirmPasswordLabel")}
                  </label>
                  <Input
                    id={confirmPasswordId}
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isLoading}
                    aria-invalid={confirmPasswordError ? true : undefined}
                    aria-describedby={
                      confirmPasswordError
                        ? `${confirmPasswordId}-error`
                        : undefined
                    }
                  />
                  {confirmPasswordError && (
                    <p
                      id={`${confirmPasswordId}-error`}
                      className="text-sm text-destructive"
                    >
                      {confirmPasswordError}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? t("recoverUpdate.submitButtonLoading")
                    : t("recoverUpdate.submitButton")}
                </Button>
              </form>
            ))}

          {status === "loading" && (
            <LoadingState message={t("recoverUpdate.submitButtonLoading")} />
          )}
          {submitError && <ErrorState message={submitError} />}
        </CardContent>
      </Card>
    </main>
  );
}
