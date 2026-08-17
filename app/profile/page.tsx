"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t, type Locale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type SessionStatus = "checking" | "signed-out" | "signed-in";
// "idle" cubre también "cargando": mientras la promesa de carga está en
// vuelo, profileStatus permanece en "idle" (evita fijar un estado de
// "loading" de forma sincrónica dentro del efecto).
type ProfileStatus = "idle" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

interface ProfileData {
  name: string | null;
  avatar_url: string | null;
  locale: string;
  referral_code: string;
}

const LOCALE_OPTIONS: { value: Locale; id: string }[] = [
  { value: "es", id: "profile-locale-es" },
  { value: "en", id: "profile-locale-en" },
];

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function ProfilePage() {
  const nameId = useId();
  const avatarUrlId = useId();
  const referralCodeId = useId();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [user, setUser] = useState<User | null>(null);

  // Idioma con el que se renderizan los textos de ESTA pantalla únicamente
  // (F3-05: puede reflejar `profiles.locale` guardado, pero no construye
  // todavía un sistema global de cambio de idioma para toda la app).
  const [activeLocale, setActiveLocale] = useState<Locale>("es");

  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [referralCode, setReferralCode] = useState("");

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [locale, setLocale] = useState<Locale>("es");
  const [avatarUrlError, setAvatarUrlError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setSessionStatus(data.user ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionStatus(session?.user ? "signed-in" : "signed-out");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionStatus !== "signed-in" || !user) {
      return;
    }

    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("name, avatar_url, locale, referral_code")
      .eq("id", user.id)
      .single()
      .then(({ data, error }: { data: ProfileData | null; error: unknown }) => {
        if (cancelled) return;

        if (error || !data) {
          setProfileStatus("error");
          return;
        }

        setName(data.name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        const resolvedLocale = SUPPORTED_LOCALES.includes(data.locale as Locale)
          ? (data.locale as Locale)
          : "es";
        setLocale(resolvedLocale);
        setActiveLocale(resolvedLocale);
        setReferralCode(data.referral_code);
        setProfileStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmedAvatarUrl = avatarUrl.trim();
    const nextAvatarUrlError =
      trimmedAvatarUrl && !isValidUrl(trimmedAvatarUrl)
        ? t("profile.validationAvatarUrlInvalid", activeLocale)
        : null;

    setAvatarUrlError(nextAvatarUrlError);

    if (nextAvatarUrlError) {
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const supabase = createClient();
      const trimmedName = name.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          name: trimmedName || null,
          avatar_url: trimmedAvatarUrl || null,
          locale,
        })
        .eq("id", user.id);

      if (error) {
        setSaveError(t("profile.errorUnexpected", activeLocale));
        setSaveStatus("error");
        return;
      }

      setActiveLocale(locale);
      setSaveStatus("success");
    } catch {
      setSaveError(t("profile.errorUnexpected", activeLocale));
      setSaveStatus("error");
    }
  }

  const isSaving = saveStatus === "saving";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("profile.title", activeLocale)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionStatus === "checking" && (
            <LoadingState message={t("profile.checkingSession", activeLocale)} />
          )}

          {sessionStatus === "signed-out" && (
            <EmptyState
              title={t("profile.signedOutTitle", activeLocale)}
              message={t("profile.signedOutMessage", activeLocale)}
              action={
                <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                  {t("profile.goToLogin", activeLocale)}
                </Link>
              }
            />
          )}

          {sessionStatus === "signed-in" && profileStatus === "idle" && (
            <LoadingState message={t("profile.loadingProfile", activeLocale)} />
          )}

          {sessionStatus === "signed-in" && profileStatus === "error" && (
            <ErrorState message={t("profile.loadErrorMessage", activeLocale)} />
          )}

          {sessionStatus === "signed-in" && profileStatus === "ready" && (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium">
                  {t("profile.nameLabel", activeLocale)}
                </label>
                <Input
                  id={nameId}
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={avatarUrlId} className="text-sm font-medium">
                  {t("profile.avatarUrlLabel", activeLocale)}
                </label>
                <Input
                  id={avatarUrlId}
                  name="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  disabled={isSaving}
                  aria-invalid={avatarUrlError ? true : undefined}
                  aria-describedby={
                    avatarUrlError ? `${avatarUrlId}-error` : undefined
                  }
                />
                {avatarUrlError && (
                  <p id={`${avatarUrlId}-error`} className="text-sm text-destructive">
                    {avatarUrlError}
                  </p>
                )}
              </div>

              <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-medium">
                  {t("profile.localeLabel", activeLocale)}
                </legend>
                {LOCALE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={option.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      id={option.id}
                      name="locale"
                      value={option.value}
                      checked={locale === option.value}
                      onChange={() => setLocale(option.value)}
                      disabled={isSaving}
                      className="size-4"
                    />
                    {option.value === "es"
                      ? t("profile.localeSpanishOption", activeLocale)
                      : t("profile.localeEnglishOption", activeLocale)}
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={referralCodeId} className="text-sm font-medium">
                  {t("profile.referralCodeLabel", activeLocale)}
                </label>
                <Input
                  id={referralCodeId}
                  name="referralCode"
                  type="text"
                  value={referralCode}
                  disabled
                  readOnly
                />
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? t("profile.saveButtonLoading", activeLocale)
                  : t("profile.saveButton", activeLocale)}
              </Button>
            </form>
          )}

          {saveStatus === "saving" && (
            <LoadingState message={t("profile.saveButtonLoading", activeLocale)} />
          )}

          {saveStatus === "success" && (
            <p role="status" className="text-sm">
              {t("profile.saveSuccessMessage", activeLocale)}
            </p>
          )}
          {saveStatus === "error" && saveError && (
            <ErrorState message={saveError} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
