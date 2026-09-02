"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type SubmitStatus = "idle" | "loading" | "success";

// Mapeo basado en `error.code` (mismo patrón que F3-01/F3-03), verificado
// empíricamente. `resetPasswordForEmail` no revela si el email existe: ante
// una dirección desconocida, Supabase responde éxito igualmente (por
// diseño), así que el único error real esperable aquí es de límite de envío.
function mapRecoverError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return t("recover.errorRateLimited");
    default:
      return t("recover.errorUnexpected");
  }
}

export default function RecoverPage() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? t("recover.validationEmailRequired")
      : null;

    setEmailError(nextEmailError);

    if (nextEmailError) {
      return;
    }

    setStatus("loading");
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/recover/update`,
      });

      if (error) {
        setSubmitError(mapRecoverError(error));
        setStatus("idle");
        return;
      }

      setStatus("success");
    } catch {
      setSubmitError(t("recover.errorUnexpected"));
      setStatus("idle");
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("recover.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === "success" ? (
            <p role="status" className="text-sm">
              {t("recover.successMessage")}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("recover.description")}
              </p>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={emailId} className="text-sm font-medium">
                    {t("recover.emailLabel")} <span aria-hidden="true">*</span>
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

                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? t("recover.submitButtonLoading")
                    : t("recover.submitButton")}
                </Button>
              </form>
            </>
          )}

          {status === "loading" && (
            <LoadingState message={t("recover.submitButtonLoading")} />
          )}
          {submitError && <ErrorState message={submitError} />}
        </CardContent>
      </Card>
    </main>
  );
}
