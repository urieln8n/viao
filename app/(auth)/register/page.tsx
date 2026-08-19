"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

// Validación mínima alineada con supabase/config.toml: minimum_password_length = 6,
// password_requirements = "" (sin exigir mayúsculas/símbolos). F3-01, VIAO_ROADMAP.md.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type SubmitStatus = "idle" | "loading" | "success" | "error";
type SuccessKind = "confirmed" | "pending-confirmation";

// Mapeo basado en `error.code` (estable en supabase-js), verificado
// empíricamente contra el proyecto Supabase real de F3-01: "email_address_invalid"
// y "over_email_send_rate_limit" son los códigos reales observados. El mensaje
// de texto libre de Supabase NO se usa como heurística porque puede contener
// palabras engañosas (p. ej. el mensaje de rate limit incluye la palabra "email").
function mapSignUpError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "user_already_exists":
      return t("register.errorEmailTaken");
    case "email_address_invalid":
      return t("register.errorInvalidEmail");
    case "weak_password":
      return t("register.errorWeakPassword");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return t("register.errorRateLimited");
    default:
      return t("register.errorUnexpected");
  }
}

export default function RegisterPage() {
  const emailId = useId();
  const passwordId = useId();
  const referralCodeId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // F8-02 (VIAO_ROADMAP.md) — opcional, sin validación de formato en el
  // cliente: el backend (trigger `handle_new_user()`) resuelve el código
  // a un `referrer_id` real o lo ignora si no existe, nunca bloquea el
  // registro por un código inválido.
  const [referralCode, setReferralCode] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<SuccessKind | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? t("register.validationEmailRequired")
      : !EMAIL_PATTERN.test(trimmedEmail)
        ? t("register.errorInvalidEmail")
        : null;
    const nextPasswordError = !password
      ? t("register.validationPasswordRequired")
      : password.length < MIN_PASSWORD_LENGTH
        ? t("register.validationPasswordLength")
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
      const trimmedReferralCode = referralCode.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        // F8-02 — el ÚNICO dato de referido que el cliente puede enviar
        // es este texto libre, guardado por Supabase Auth en
        // `raw_user_meta_data` (verificado empíricamente antes de esta
        // fase). Nunca un `referrer_id`: el backend resuelve el código a
        // su propietario dentro del trigger de alta, server-side.
        ...(trimmedReferralCode
          ? { options: { data: { referral_code: trimmedReferralCode } } }
          : {}),
      });

      if (error) {
        setSubmitError(mapSignUpError(error));
        setStatus("error");
        return;
      }

      setSuccessKind(data.session ? "confirmed" : "pending-confirmation");
      setStatus("success");
    } catch {
      setSubmitError(t("register.errorUnexpected"));
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === "success" && successKind ? (
            <p role="status" className="text-sm">
              {successKind === "confirmed"
                ? t("register.successConfirmed")
                : t("register.successPendingConfirmation")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {t("register.emailLabel")}
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
                  {t("register.passwordLabel")}
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
                  aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                />
                {passwordError && (
                  <p id={`${passwordId}-error`} className="text-sm text-destructive">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={referralCodeId} className="text-sm font-medium">
                  {t("register.referralCodeLabel")}
                </label>
                <Input
                  id={referralCodeId}
                  name="referralCode"
                  type="text"
                  autoComplete="off"
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("register.submitButtonLoading")
                  : t("register.submitButton")}
              </Button>

              {/* Bloque 13 ("Pulido final antes del piloto") — navegación
                  Register -> Login, ruta ya existente (F3-03). */}
              <p className="text-center text-sm text-muted-foreground">
                {t("register.loginPromptText")}{" "}
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                  {t("register.loginPromptLink")}
                </Link>
              </p>
            </form>
          )}

          {status === "loading" && (
            <LoadingState message={t("register.submitButtonLoading")} />
          )}
          {status === "error" && submitError && <ErrorState message={submitError} />}
        </CardContent>
      </Card>
    </main>
  );
}
