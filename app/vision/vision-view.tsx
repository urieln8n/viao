"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Camera, Eye, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// F10-00→F10-04 (VIAO_ROADMAP.md) — Único punto de la app que invoca las
// Server Actions de Vision.
//
// Corrección de arquitectura de este bloque ("Cámara como flujo
// principal de Vision"): antes, `handleScan` mandaba el `File` original
// dentro del FormData de `scanVisionAction` — una Server Action de
// Next.js tiene un límite de tamaño de cuerpo (1 MB por defecto),
// bastante menor que una foto real de móvil, así que cualquier captura
// de cámara mínimamente grande hacía fallar la Action ANTES de que su
// propio código llegara a ejecutarse ("Body exceeded 1 MB limit").
//
// La imagen ahora se sube DIRECTAMENTE del navegador al bucket privado
// `photos` (mismo patrón exacto que ya usaba "Guardar imagen"/
// AddPhotoForm — RLS `photos_insert_own` ya permite al propio usuario
// subir a su propia carpeta, sin service_role) ANTES de llamar a la
// Server Action — así el binario nunca atraviesa el cuerpo de la Action,
// solo una ruta de texto (`imagePath`). `scanVisionAction` descarga los
// bytes desde Storage server-side (una petición saliente normal, sin el
// límite de las Server Actions) para poder seguir ejecutando EXACTAMENTE
// la misma validación (`validateImage`, magic bytes reales, límite de
// 10 MB ya vigente en `lib/vision/config.ts` — nunca se tocó, ya
// coincidía con el bucket) y la misma llamada a OpenAI
// (`generateVisionScan`, base64, sin cambios) que existían antes de este
// bloque. Si el usuario decide "Guardar en Mi viaje" después, se
// reutiliza la MISMA ruta ya subida — no hay una segunda subida.
//
// "Guardar imagen" (F10-04) sigue sin pasar por una Server Action para el
// paso de subida (ya no hace falta ninguna: el archivo ya está en
// Storage desde el escaneo) — solo inserta la fila en `photos` con la
// ruta ya conocida.
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

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function VisionView({
  initialHasConsent,
}: {
  initialHasConsent: boolean;
}) {
  const languageSelectId = useId();
  const cameraInputId = useId();
  const galleryInputId = useId();

  const [hasConsent, setHasConsent] = useState(initialHasConsent);
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [scanResult, setScanResult] = useState<ScanVisionActionResult | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Previsualización local instantánea (Object URL), sin subir nada
  // todavía — "repetir foto" simplemente descarta esto, sin haber tocado
  // Storage. Solo al confirmar (handleScan) se sube de verdad. Derivada
  // con `useMemo` (no `useState`+`useEffect`): es puramente una función
  // de `file`, así que no hay ningún estado propio que sincronizar — el
  // único efecto secundario real es revocar la URL anterior, que sí vive
  // en su propio `useEffect` de limpieza, sin llamar a `setState` dentro.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetCapture(clearInputs: boolean) {
    setFile(null);
    setScanResult(null);
    setUploadedPath(null);
    setUploadError(null);
    setDeleteMessage(null);
    if (clearInputs) {
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    resetCapture(false);
    setFile(nextFile);
  }

  function handleRetake() {
    resetCapture(true);
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
        resetCapture(true);
      }
    });
  }

  function handleScan() {
    if (!file) return;
    startTransition(async () => {
      setUploadError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setScanResult({ status: "unauthenticated" });
        return;
      }

      const storagePath = `${user.id}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadErr) {
        setUploadError(uploadErr.message);
        return;
      }
      setUploadedPath(storagePath);

      const formData = new FormData();
      formData.append("imagePath", storagePath);
      formData.append("targetLanguage", targetLanguage);
      const result = await scanVisionAction(formData);
      setScanResult(result);
      setDeleteMessage(null);

      // Si el escaneo falló, el archivo ya subido no sirve para nada
      // (best-effort: un fallo al borrarlo no es crítico, solo deja un
      // objeto huérfano en la carpeta privada del propio usuario).
      if (result.status !== "success") {
        await supabase.storage.from("photos").remove([storagePath]);
        setUploadedPath(null);
      }
    });
  }

  function handleDeleteScan() {
    if (scanResult?.status !== "success") return;
    startTransition(async () => {
      const result = await deleteVisionScanAction(scanResult.scanId);
      if (result.status === "success" && result.deleted) {
        setDeleteMessage(t("vision.deleteSuccessMessage"));
        // best-effort: si nunca se guardó en Mi viaje, el archivo sigue
        // en Storage sin ninguna fila que lo referencie — se limpia aquí.
        if (uploadedPath) {
          const supabase = createClient();
          await supabase.storage.from("photos").remove([uploadedPath]);
        }
        resetCapture(true);
      }
    });
  }

  const scanMessage = scanResult ? scanErrorMessageFor(scanResult) : undefined;
  const isScanned = scanResult?.status === "success";

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-info/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5 text-info" aria-hidden="true" />
            {t("vision.title")}
          </CardTitle>
          <CardDescription>{t("vision.tagline")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 border-b border-border pb-4">
            <h2 className="text-sm font-medium">{t("vision.consentTitle")}</h2>
            {hasConsent ? (
              <div className="flex flex-wrap items-center gap-2">
                <p role="status" className="text-sm text-muted-foreground">
                  {t("vision.consentGrantedStatus")}
                </p>
                <Button variant="outline" onClick={handleWithdrawConsent} disabled={isPending}>
                  {t("vision.withdrawConsentButton")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">{t("vision.consentDescription")}</p>
                <Button onClick={handleGrantConsent} disabled={isPending}>
                  {t("vision.grantConsentButton")}
                </Button>
              </div>
            )}
          </div>

          {hasConsent && !file && (
            // Fase 1 ("¿Qué quieres entender?") — la cámara es la acción
            // principal en móvil: <input capture="environment"> abre
            // directamente la cámara trasera del dispositivo, sin
            // dependencia ni SDK nuevo. En navegadores/dispositivos que no
            // soportan `capture` (típicamente desktop), degrada de forma
            // natural a un selector de archivo normal — mismo elemento,
            // sin ninguna rama de código adicional.
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">{t("vision.description")}</p>

              <label htmlFor={cameraInputId} className="w-full">
                <span
                  className={
                    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-viao-orange px-4 text-sm font-medium text-viao-orange-foreground transition-colors hover:bg-viao-orange/85"
                  }
                >
                  <Camera className="size-4" aria-hidden="true" />
                  {t("vision.openCameraButton")}
                </span>
              </label>
              <input
                ref={cameraInputRef}
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
              />

              <label htmlFor={galleryInputId} className="w-fit">
                <span className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline">
                  <ImageIcon className="size-4" aria-hidden="true" />
                  {t("vision.chooseGalleryButton")}
                </span>
              </label>
              <input
                ref={galleryInputRef}
                id={galleryInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          )}

          {hasConsent && file && !isScanned && (
            // Fase 2 (previsualización) — el usuario confirma o repite
            // antes de que VIAO procese nada.
            <div className="flex flex-col gap-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- previsualización local (Object URL de un File recién capturado), nunca una URL remota: next/image no aporta nada aquí.
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-64 w-full rounded-lg border border-border object-contain"
                />
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor={languageSelectId} className="text-sm font-medium">
                  {t("vision.languageLabel")}
                </label>
                <select
                  id={languageSelectId}
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleScan} disabled={isPending}>
                  {isPending ? t("vision.scanButtonLoading") : t("vision.scanButton")}
                </Button>
                <Button variant="outline" onClick={handleRetake} disabled={isPending}>
                  {t("vision.retakeButton")}
                </Button>
              </div>
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            </div>
          )}

          {scanMessage && (
            <div className="flex flex-col gap-2">
              <ErrorState message={scanMessage} />
              <Button variant="outline" onClick={handleRetake} disabled={isPending} className="w-fit">
                {t("vision.retakeButton")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isScanned && scanResult.status === "success" && (
        // Fase 3 (resultado) — Card propia, mismo acento azul que el
        // resto de Vision (Bloque 19).
        <Card className="border-info/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Eye className="size-4" aria-hidden="true" />
              {t("vision.resultTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- misma previsualización local que la fase 2, mostrada aquí en pequeño junto al resultado.
              <img
                src={previewUrl}
                alt=""
                className="max-h-40 w-full rounded-lg border border-border object-contain"
              />
            )}
            <p role="status" className="text-sm whitespace-pre-wrap">
              {scanResult.translatedText}
            </p>
            <p className="text-sm text-muted-foreground">{scanResult.explanation}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDeleteScan} disabled={isPending}>
                {t("vision.deleteButton")}
              </Button>
              <Button variant="outline" onClick={handleRetake} disabled={isPending}>
                {t("vision.scanAgainButton")}
              </Button>
            </div>
            {deleteMessage && <p role="status" className="text-sm">{deleteMessage}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
