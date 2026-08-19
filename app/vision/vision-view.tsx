"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

import {
  scanVisionAction,
  grantVisionConsentAction,
  withdrawVisionConsentAction,
  deleteVisionScanAction,
  type ScanVisionActionResult,
} from "./actions";
import type { TripListItem } from "../../lib/trips/get-user-trips";

// F10-00→F10-04 (VIAO_ROADMAP.md) — Único punto de la app que invoca las
// Server Actions de Vision. Necesario para poder ejercitar el flujo real
// con sesión de navegador en el E2E obligatorio de la fase (mismo criterio
// ya usado en F9 para app/search/ai-recommendation/).
//
// "Guardar imagen" (F10-04) NO pasa por una Server Action: RLS Patrón A
// ya permite al propio cliente subir a Storage (`photos_insert_own`,
// F1-10) e insertar en `photos` (`photos_insert_own`, F1-06) directamente
// — un trigger server-side (migración 20260818170000) sincroniza
// `vision_scans.image_retained` automáticamente.
//
// Bloque 11 ("Conexión del MVP para piloto") — `tripId` ya NO es un campo
// de texto libre: `trips` (prop, ya cargada server-side por
// `app/vision/page.tsx` vía `getUserTrips()`, F11-01) alimenta un
// `<select>` con los viajes reales del usuario — nunca se pide ni se
// expone ningún UUID en la UI. El estado `tripId` y su uso en
// `handleScan`/`handleSave` no cambian: `scanVisionAction` (F10-02) sigue
// leyendo exactamente el mismo campo `tripId` del FormData, y sigue
// verificando la propiedad del viaje server-side
// (`lib/vision/create-vision-scan-record.ts`) — este cambio es
// exclusivamente de qué valor puede llegar a proponer la UI, nunca de
// confianza nueva depositada en el cliente.
function scanErrorMessageFor(result: ScanVisionActionResult): string | undefined {
  switch (result.status) {
    case "unauthenticated":
      return t("vision.errorUnauthenticated");
    case "vision_disabled":
      return t("vision.errorDisabled");
    case "no_consent":
      return t("vision.errorNoConsent");
    case "rate_limited":
      return t("vision.errorRateLimited");
    case "invalid_image":
      return t("vision.errorInvalidImage");
    case "provider_error":
      return result.message;
    default:
      return undefined;
  }
}

export function VisionView({
  initialHasConsent,
  trips,
}: {
  initialHasConsent: boolean;
  trips: TripListItem[];
}) {
  const tripSelectId = useId();

  const [hasConsent, setHasConsent] = useState(initialHasConsent);
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [tripId, setTripId] = useState("");
  const [scanResult, setScanResult] = useState<ScanVisionActionResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setScanResult(null);
    setSaveMessage(null);
    setDeleteMessage(null);
  }

  function handleGrantConsent() {
    startTransition(async () => {
      const result = await grantVisionConsentAction();
      if (result.status === "success") {
        setHasConsent(true);
      }
    });
  }

  function handleWithdrawConsent() {
    startTransition(async () => {
      const result = await withdrawVisionConsentAction();
      if (result.status === "success") {
        setHasConsent(false);
        setScanResult(null);
      }
    });
  }

  function handleScan() {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("targetLanguage", targetLanguage);
      if (tripId) formData.append("tripId", tripId);
      const result = await scanVisionAction(formData);
      setScanResult(result);
      setSaveMessage(null);
      setDeleteMessage(null);
    });
  }

  function handleSave() {
    if (!file || scanResult?.status !== "success" || !tripId) return;
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveMessage(t("vision.errorUnauthenticated"));
        return;
      }

      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const storagePath = `${user.id}/${scanResult.scanId}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) {
        setSaveMessage(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("photos").insert({
        user_id: user.id,
        trip_id: tripId,
        vision_scan_id: scanResult.scanId,
        storage_path: storagePath,
      });
      if (insertError) {
        setSaveMessage(insertError.message);
        return;
      }

      setSaveMessage(t("vision.saveSuccessMessage"));
    });
  }

  function handleDeleteScan() {
    if (scanResult?.status !== "success") return;
    startTransition(async () => {
      const result = await deleteVisionScanAction(scanResult.scanId);
      if (result.status === "success" && result.deleted) {
        setDeleteMessage(t("vision.deleteSuccessMessage"));
        setScanResult(null);
      }
    });
  }

  const scanMessage = scanResult ? scanErrorMessageFor(scanResult) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("vision.consentTitle")}</h2>
        {hasConsent ? (
          <div className="flex items-center gap-2">
            <p role="status" className="text-sm text-muted-foreground">
              {t("vision.consentGrantedStatus")}
            </p>
            <Button variant="outline" onClick={handleWithdrawConsent} disabled={isPending}>
              {t("vision.withdrawConsentButton")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{t("vision.consentDescription")}</p>
            <Button onClick={handleGrantConsent} disabled={isPending}>
              {t("vision.grantConsentButton")}
            </Button>
          </div>
        )}
      </section>

      {hasConsent && (
        <section className="flex flex-col gap-3">
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          {trips.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={tripSelectId} className="text-sm font-medium">
                {t("vision.tripSelectLabel")}
              </label>
              <select
                id={tripSelectId}
                value={tripId}
                onChange={(event) => setTripId(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">{t("vision.tripSelectNoneOption")}</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.destination}
                    {trip.startDate && trip.endDate
                      ? ` · ${trip.startDate} — ${trip.endDate}`
                      : ` · ${t("trips.datesUnset")}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("vision.tripSelectEmptyState")}</p>
          )}
          <Button onClick={handleScan} disabled={!file || isPending}>
            {isPending ? t("vision.scanButtonLoading") : t("vision.scanButton")}
          </Button>
        </section>
      )}

      {scanResult?.status === "success" && (
        <section className="flex flex-col gap-2">
          <p role="status" className="text-sm whitespace-pre-wrap">
            {scanResult.translatedText}
          </p>
          <p className="text-sm text-muted-foreground">{scanResult.explanation}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isPending || !tripId}>
              {t("vision.saveButton")}
            </Button>
            <Button variant="outline" onClick={handleDeleteScan} disabled={isPending}>
              {t("vision.deleteButton")}
            </Button>
          </div>
          {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}
          {deleteMessage && <p role="status" className="text-sm">{deleteMessage}</p>}
        </section>
      )}
      {scanMessage && <ErrorState message={scanMessage} />}
    </div>
  );
}
