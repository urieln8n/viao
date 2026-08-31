"use client";

import { useState, type FormEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { updatePartnerProfileAction } from "./actions";
import { PARTNER_CATEGORIES, type PartnerCategory } from "../../../../lib/partners/request-partner-registration";
import { CATEGORY_LABEL_KEY } from "../../category-label";
import type { PartnerEditableProfile } from "../../../../lib/partners/get-partner-for-editing";

// UX-12 (Partner Self-Service C1) — mismo patrón de formulario que
// app/partners/join/partner-join-form.tsx (mismos campos, mismos
// estilos nativos de <select>/<textarea>), reutilizando sus mismas
// claves de i18n (`partnerJoin.*`) para nombre/categoría/descripción/
// dirección/teléfono/imagen — el campo es idéntico, solo cambia el
// contexto (edición vs. alta). Nunca envía `status`/`access_token`/
// `is_test`/`slug`/`id`: `PartnerProfileUpdateInput` no tiene esos
// campos, así que ni siquiera pueden construirse aquí por error.
const FIELD_CLASSNAME =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

interface MyBusinessFormProps {
  accessToken: string;
  profile: PartnerEditableProfile;
}

export function MyBusinessForm({ accessToken, profile }: MyBusinessFormProps) {
  const [name, setName] = useState(profile.name);
  const [category, setCategory] = useState<PartnerCategory>(profile.category as PartnerCategory);
  const [description, setDescription] = useState(profile.description ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "");
  const [imageUrl, setImageUrl] = useState(profile.imageUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setStatus("error");
      setErrorMessage(t("partnerJoin.validationError"));
      return;
    }

    setStatus("saving");
    setErrorMessage(undefined);

    const result = await updatePartnerProfileAction(accessToken, {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      address: address.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });

    if (result.outcome === "updated") {
      setStatus("saved");
      return;
    }

    setStatus("error");
    setErrorMessage(
      result.outcome === "invalid_input" ? t("partnerJoin.validationError") : t("partnerDashboard.myBusinessErrorGeneric"),
    );
  }

  const isSaving = status === "saving";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("partnerDashboard.myBusinessTitle")}</CardTitle>
        <CardDescription>{t("partnerDashboard.myBusinessDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
          onChange={() => status !== "idle" && status !== "saving" && setStatus("idle")}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("partnerJoin.nameLabel")}
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("partnerJoin.categoryLabel")}
            <select
              className={FIELD_CLASSNAME + " h-11"}
              value={category}
              onChange={(e) => setCategory(e.target.value as PartnerCategory)}
              disabled={isSaving}
            >
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
              disabled={isSaving}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("partnerJoin.addressLabel")}
            <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={isSaving} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("partnerJoin.phoneLabel")}
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={isSaving}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("partnerJoin.imageUrlLabel")}
            <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isSaving} />
          </label>

          {status === "error" && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {status === "saved" && (
            <p className="text-sm font-medium text-success">{t("partnerDashboard.myBusinessSuccessMessage")}</p>
          )}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("partnerDashboard.myBusinessSaving") : t("partnerDashboard.myBusinessSaveCta")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
