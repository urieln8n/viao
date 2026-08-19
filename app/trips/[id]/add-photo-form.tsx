"use client";

import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

// Bloque 16 ("Fotos reales en Mi viaje", segundo objetivo) — reutiliza
// EXACTAMENTE el mismo patrón de subida ya usado por "Guardar imagen" en
// VIAO Vision (app/vision/vision-view.tsx, handleSave): sube directamente
// al bucket `photos` con el cliente de sesión del navegador (RLS Patrón A,
// `photos_insert_own`/storage `photos_insert_own` ya permiten al propio
// usuario hacerlo, sin Server Action ni service_role) e inserta la fila en
// `photos` con el mismo storage_path. Única diferencia real: aquí no hay
// ningún escaneo de Vision previo, así que `vision_scan_id` va `null` (la
// policy de INSERT ya endurecida lo permite explícitamente) y el nombre de
// archivo usa un UUID aleatorio en vez del id del escaneo (no existe
// ningún otro identificador único disponible en este flujo).
export function AddPhotoForm({ tripId }: { tripId: string }) {
  const fileInputId = useId();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setErrorMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage(t("trips.addPhotoErrorUnauthenticated"));
        return;
      }

      const extension =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) {
        setErrorMessage(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("photos").insert({
        user_id: user.id,
        trip_id: tripId,
        vision_scan_id: null,
        storage_path: storagePath,
      });
      if (insertError) {
        setErrorMessage(insertError.message);
        return;
      }

      setFile(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={fileInputId} className="text-sm font-medium">
        {t("trips.addPhotoLabel")}
      </label>
      <Input
        id={fileInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={isPending}
      />
      <Button type="submit" variant="outline" disabled={!file || isPending} className="w-fit">
        {isPending ? t("trips.addPhotoButtonLoading") : t("trips.addPhotoButton")}
      </Button>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </form>
  );
}
