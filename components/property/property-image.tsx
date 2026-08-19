"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface PropertyImageProps {
  src: string | undefined;
  alt: string;
  aspect?: "video" | "square";
  className?: string;
}

// Bloque 8 (VIAO Design System) — corrige un bug real encontrado en el
// preflight del bloque: `Property.mainPhotoUrl` (types/travel.ts) puede
// estar *presente* sin apuntar a una imagen que realmente cargue —
// confirmado empíricamente contra `MockHotelProvider`
// (lib/travel-provider/mock-provider.ts): sus 4 propiedades usan
// `https://mock-provider.local/photos/mock-00X.jpg`, un dominio ficticio
// que nunca resuelve. El código anterior (app/search/results/page.tsx)
// solo comprobaba "¿existe la URL?", nunca "¿carga de verdad?", así que
// el estado limpio de "sin imagen" (`ImageOff`) nunca llegaba a mostrarse
// — quedaba un rectángulo `bg-muted` vacío en su lugar.
//
// Aquí se detecta el fallo real de carga vía `onError` (por eso es
// Client Component) y se cae al mismo tratamiento visual ya usado en el
// resto de la app (icono `ImageOff` sobre `bg-muted`) — no se inventa
// ninguna imagen ni se cambia `mainPhotoUrl` en `lib/`.
export function PropertyImage({
  src,
  alt,
  aspect = "video",
  className,
}: PropertyImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        aspect === "video" ? "aspect-video" : "aspect-square",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
