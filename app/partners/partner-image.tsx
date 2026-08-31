"use client";

import { useEffect, useRef, useState } from "react";
import { Store } from "lucide-react";

// Micro-fix (Partner Real E2E Test — hallazgo confirmado visualmente) —
// `partner.imageUrl` es texto libre sin validar (§ auditoría UX-13): una
// URL que existe como cadena pero falla al cargar (dominio inexistente,
// 404, CORS...) mostraba el icono nativo de imagen rota del navegador en
// vez del placeholder de VIAO — porque ni `[slug]/page.tsx` ni
// `partner-card.tsx` son Client Components, así que ninguno podía
// escuchar `onError` (evento del DOM, requiere JS hidratado). Este
// componente centraliza esa única pieza interactiva — reutilizado por
// ambos consumidores en vez de duplicar el estado dos veces — y NUNCA
// toca `partner.imageUrl` en base de datos: sigue siendo exactamente el
// mismo texto libre, solo cambia cómo se renderiza si falla.
//
// El chequeo en `useEffect` cubre una carrera de hidratación real
// (confirmada durante la verificación E2E de este mismo micro-fix): el
// HTML llega server-renderizado con el `<img>` ya en el DOM, así que el
// navegador puede intentar (y fallar) la carga ANTES de que React
// hidrate y conecte `onError` — ese evento nativo se pierde sin más. Al
// montar, `complete && naturalWidth === 0` detecta ese "ya roto antes de
// hidratar" sin depender de que el evento llegue a tiempo.
interface PartnerImageProps {
  src?: string;
  imageClassName: string;
  placeholderClassName: string;
  iconClassName: string;
}

export function PartnerImage({ src, imageClassName, placeholderClassName, iconClassName }: PartnerImageProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailedToLoad(true);
    }
  }, [src]);

  if (!src || failedToLoad) {
    return (
      <div className={placeholderClassName}>
        <Store className={iconClassName} aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL de texto libre (sin bucket de Storage), no cabe en next/image sin configurar dominios remotos arbitrarios.
    <img ref={imgRef} src={src} alt="" className={imageClassName} onError={() => setFailedToLoad(true)} />
  );
}
