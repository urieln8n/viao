"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Check, Copy, Gift } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/loading-state";
import { t, type Locale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getProfileRewardsBalanceAction, completeProfileCompletedMissionAction } from "./actions";

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

  // UX-2 (World-Class Product Design) — Fase G: estado puramente de UI,
  // sin ninguna llamada a backend nueva. `referralCode` ya existe y ya se
  // carga (ver el efecto de abajo); esto solo controla el icono/texto del
  // botón de copiar durante 2s tras un click exitoso.
  const [referralCodeCopied, setReferralCodeCopied] = useState(false);

  // Bloque 16 ("Perfil") — resumen de Rewards, mismo criterio "undefined
  // = sin sesión/sin cargar todavía" que StatCard en Home (app/page.tsx).
  const [rewardsBalance, setRewardsBalance] = useState<number | undefined>(undefined);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // UX-16.3 (Commerce Identity) — "undefined" = sin comprobar todavía,
  // mismo criterio que rewardsBalance. La comprobación en sí (más abajo)
  // usa el cliente de sesión directamente: RLS (`owner_id = auth.uid()`)
  // ya restringe el resultado a lo que esta persona posee, sin necesitar
  // ningún endpoint nuevo — si devuelve >=1 fila, tiene al menos un
  // Commerce vinculado.
  const [hasOwnedCommerce, setHasOwnedCommerce] = useState<boolean | undefined>(undefined);

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

  // Bloque 16 ("Perfil") — reutiliza getWalletBalance() (lib/rewards/,
  // Bloque 15) vía el wrapper de Server Action de ./actions.ts, sin
  // duplicar su query. Efecto independiente del de arriba (perfil vs
  // rewards son datos no relacionados) para que un fallo en uno no
  // bloquee al otro.
  useEffect(() => {
    if (sessionStatus !== "signed-in") {
      return;
    }

    let cancelled = false;
    getProfileRewardsBalanceAction().then((balance) => {
      if (!cancelled) {
        setRewardsBalance(balance);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  // UX-16.3 (Commerce Identity) — consulta directa vía el cliente de
  // sesión del propio navegador (mismo patrón que el efecto de `profiles`
  // de arriba): `id` SÍ está en el GRANT de SELECT de `partners`
  // (20260831140000_add_partners_owner_id_identity.sql), y RLS
  // (`owner_id = auth.uid()`) ya limita el resultado a lo propio — no
  // hace falta filtrar por `owner_id` en la query ni pasar por ninguna
  // Server Action nueva.
  useEffect(() => {
    if (sessionStatus !== "signed-in") {
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("partners")
      .select("id")
      .limit(1)
      .then(({ data }: { data: { id: string }[] | null }) => {
        if (!cancelled) {
          setHasOwnedCommerce(Boolean(data && data.length > 0));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  // Bloque 16 ("Perfil") — MISMO patrón exacto que handleLogout en
  // app/(auth)/login/page.tsx: signOut() + onAuthStateChange (ya
  // suscrito arriba) actualiza sessionStatus automáticamente, sin
  // redirección manual.
  // UX-2 (World-Class Product Design) — Fase G: copia al portapapeles del
  // código ya cargado en memoria (`referralCode`) — ninguna llamada de
  // red, ningún dato nuevo. `navigator.clipboard` requiere un contexto
  // seguro (https/localhost), ya garantizado en producción y en dev.
  async function handleCopyReferralCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setReferralCodeCopied(true);
      setTimeout(() => setReferralCodeCopied(false), 2000);
    } catch {
      // Best-effort puramente visual: si el portapapeles no está
      // disponible (permiso denegado, navegador antiguo), el código
      // sigue siendo perfectamente legible/seleccionable a mano — no se
      // muestra ningún error, no hay nada roto que reportar.
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLogoutLoading(false);
  }

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
      // FASE J-B4 — Mission "profile_completed" (reemplaza a
      // search_started). Best-effort, nunca bloquea ni condiciona el
      // guardado ya confirmado — completeProfileCompletedMissionAction()
      // vuelve a comprobar server-side que name/avatar_url quedaron
      // rellenos antes de otorgar nada.
      void completeProfileCompletedMissionAction();
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
            <ErrorState
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
            <ErrorState message={t("profile.loadErrorMessage", activeLocale)} locale={activeLocale} />
          )}

          {sessionStatus === "signed-in" && profileStatus === "ready" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {t("profile.emailLabel", activeLocale)}
              </span>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
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
                    className="flex min-h-11 items-center gap-2 text-sm"
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
                <span id={referralCodeId} className="text-sm font-medium">
                  {t("profile.referralCodeLabel", activeLocale)}
                </span>
                {/* UX-2 (World-Class Product Design) — Fase G: hallazgo ya
                    documentado en VIAO_PREMIUM_DESIGN_UX_V1.md sección 22
                    ("un Input disabled más, no se siente algo para
                    compartir con orgullo"). Mismo lenguaje visual que el
                    código de canje de Rewards (chip con borde, mono,
                    tracking-wider — "si dos componentes hacen cosas
                    parecidas, deben parecer pertenecer a la misma
                    familia"): este también es un código que el usuario
                    enseña/comparte, no un campo de formulario que rellena.
                    Botón de copiar añadido — utilidad real, cero llamada
                    de red nueva. Ningún dato ni cálculo cambia. */}
                <div
                  role="group"
                  aria-labelledby={referralCodeId}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 rounded-md border border-border bg-muted px-3 py-2.5 text-center font-mono text-lg font-semibold tracking-[0.15em]">
                    {referralCode}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyReferralCode}
                    aria-label={t("profile.referralCodeCopyCta", activeLocale)}
                  >
                    {referralCodeCopied ? (
                      <Check className="text-info" aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("profile.referralCodeExplainer", activeLocale)}
                </p>
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? t("profile.saveButtonLoading", activeLocale)
                  : t("profile.saveButton", activeLocale)}
              </Button>
            </form>
          )}

          {/* FASE J-B2.5 (Travel Legacy Purge) — se retira aquí el bloque
              "Mis viajes" (CTA a /trips) que existía entre Rewards y
              Cuenta: era la última referencia Travel visible en Perfil.
              `/trips` no se elimina como ruta, solo pierde este punto de
              entrada. `profile.tripsTitle`/`profile.viewTripsCta` quedan
              huérfanas en lib/i18n (no se tocan en este bloque). */}
          {sessionStatus === "signed-in" && profileStatus === "ready" && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Gift className="size-4 shrink-0 text-success" aria-hidden="true" />
                {t("profile.rewardsTitle", activeLocale)}
              </span>
              {rewardsBalance !== undefined && (
                // UX-4 (Partners clarity + Points semantics) — se retira
                // aquí el equivalente "≈X.XX€ de valor" que existía debajo
                // del saldo: era la única pantalla Core activa donde
                // Points se presentaba con una equivalencia monetaria
                // explícita, contradiciendo "Points no son dinero"
                // (comentario propio de lib/rewards/rules.ts). No se toca
                // `pointsToEuroValue()` ni `rewards.valueSuffix` — ambos
                // siguen teniendo consumidores reales en Travel/Booking.
                <p className="text-2xl font-semibold text-success">
                  <span className="font-mono tabular-nums">{rewardsBalance}</span>{" "}
                  {t("rewards.pointsUnit", activeLocale)}
                </p>
              )}
              <Link
                href="/rewards"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("profile.viewRewardsCta", activeLocale)}
              </Link>
            </div>
          )}

          {/* J-B7.5 (VIAO_V1_MASTER_ROADMAP.md, Condición #2 de J-B7) —
              Product Decision Lock: colocación mínima y transitoria de
              supervivencia, NO el hogar definitivo de Vision (Vision sigue
              en estado DECOUPLE, sin integración con Goals/Points/Rewards/
              Missions/Partners/Wallet — no se inventa ninguna aquí). Único
              objetivo: que Vision no quede inalcanzable cuando Trips se
              retire. Mismo patrón que el bloque Rewards de arriba, en el
              mismo hueco estructural que ocupaba "Mis viajes" antes de
              J-B2.5. El CTA Trips → Vision (app/trips/[id]/page.tsx) NO se
              toca en este bloque — ver PENDIENTE FUTURO en el informe de
              la fase. */}
          {sessionStatus === "signed-in" && profileStatus === "ready" && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-medium">
                {t("vision.title", activeLocale)}
              </span>
              <Link
                href="/vision"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("home.visionTeaserCta", activeLocale)}
              </Link>
            </div>
          )}

          {/* UX-16.3 (Commerce Identity) — solo visible si la sesión tiene
              al menos un Commerce vinculado. Lleva a /partners/dashboard
              (Camino B, resuelve por sesión) — nunca se renderiza el
              Dashboard de Commerce aquí dentro, solo un enlace de salida. */}
          {sessionStatus === "signed-in" && profileStatus === "ready" && hasOwnedCommerce && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-medium">{t("profile.manageCommerceCta", activeLocale)}</span>
              <Link
                href="/partners/dashboard"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("profile.manageCommerceCta", activeLocale)}
              </Link>
            </div>
          )}

          {/* UX-17.2 — hermano mutuamente excluyente del bloque de arriba:
              solo cuando hasOwnedCommerce es explícitamente false (nunca
              mientras está undefined/sin comprobar todavía, mismo criterio
              que el resto de esta pantalla). Reutiliza las mismas claves
              i18n que login/register.tsx y app/partners/page.tsx. */}
          {sessionStatus === "signed-in" && profileStatus === "ready" && hasOwnedCommerce === false && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                {t("partners.joinTeaser", activeLocale)}{" "}
                <Link href="/partners/join" className="text-primary underline-offset-4 hover:underline">
                  {t("partners.joinTeaserCta", activeLocale)}
                </Link>
              </p>
            </div>
          )}

          {sessionStatus === "signed-in" && profileStatus === "ready" && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-medium">
                {t("profile.accountTitle", activeLocale)}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading
                  ? t("login.loggingOut", activeLocale)
                  : t("login.logoutButton", activeLocale)}
              </Button>
            </div>
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
            <ErrorState message={saveError} locale={activeLocale} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
