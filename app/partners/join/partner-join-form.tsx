"use client";

import { useState, type FormEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import Link from "next/link";

import { submitPartnerRegistrationAction } from "../join-actions";
import { PARTNER_CATEGORIES, type PartnerCategory } from "../../../lib/partners/request-partner-registration";
import { CATEGORY_LABEL_KEY } from "../category-label";

// UX-10 (Partners Visible + Discovery + Registration) — §12-13: mismo
// patrón de máquina de estados (`step`) ya usado en
// app/rewards/reward-catalog.tsx / partner-ops-view.tsx. Sin login: un
// comercio que quiere unirse a VIAO no necesita ya tener cuenta.
// `submitPartnerRegistrationAction` es la única vía de escritura —
// nunca envía `status`/`access_token`/`is_test` (ninguno de los dos es
// siquiera un campo de este formulario).
//
// Mismos elementos nativos que Input (h-11, rounded-lg, border-input)
// para `<select>`/`<textarea>` en vez de introducir un componente shadcn
// nuevo — no hay ningún otro <select>/<textarea> en el proyecto todavía,
// y este formulario no lo justifica por sí solo.
const FIELD_CLASSNAME =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

type ViewState = { step: "form" } | { step: "success" } | { step: "error"; message: string };

export function PartnerJoinForm() {
  const [view, setView] = useState<ViewState>({ step: "form" });
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PartnerCategory | "">("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError(undefined);

    if (!name.trim() || !category) {
      setValidationError(t("partnerJoin.validationError"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPartnerRegistrationAction({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (result.outcome === "submitted") {
        setView({ step: "success" });
        return;
      }
      if (result.outcome === "invalid_input") {
        setValidationError(t("partnerJoin.validationError"));
        return;
      }
      setView({ step: "error", message: t("partnerJoin.errorGeneric") });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view.step === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("partnerJoin.successTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("partnerJoin.successMessage")}</p>
          <Link href="/partners" className={buttonVariants({ variant: "outline", className: "self-start" })}>
            {t("partnerJoin.backCta")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (view.step === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <p className="text-sm text-destructive">{view.message}</p>
          <Button variant="outline" onClick={() => setView({ step: "form" })}>
            {t("partnerJoin.backCta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.nameLabel")}
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.categoryLabel")}
        <select
          className={FIELD_CLASSNAME + " h-11"}
          value={category}
          onChange={(e) => setCategory(e.target.value as PartnerCategory)}
          disabled={isSubmitting}
        >
          <option value="" disabled>
            {t("partnerJoin.categoryPlaceholder")}
          </option>
          {PARTNER_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(CATEGORY_LABEL_KEY[value])}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.descriptionLabel")}
        <textarea
          className={FIELD_CLASSNAME + " min-h-20 py-2"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.addressLabel")}
        <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={isSubmitting} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.emailLabel")}
        <Input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          disabled={isSubmitting}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.phoneLabel")}
        <Input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          disabled={isSubmitting}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("partnerJoin.imageUrlLabel")}
        <Input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={isSubmitting}
        />
      </label>

      {validationError && <p className="text-sm text-destructive">{validationError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("partnerJoin.submitting") : t("partnerJoin.submitCta")}
      </Button>
    </form>
  );
}
