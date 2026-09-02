"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "./input";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

// UX-AUTH-1 — mostrar/ocultar contraseña, compartido entre los 3
// formularios que piden password (register, login, recover/update) en
// vez de triplicar el mismo botón+estado tres veces. Único componente
// nuevo de este bloque: la alternativa (repetir la misma lógica en cada
// formulario) es peor práctica y más difícil de mantener, así que se
// justifica como la extensión mínima necesaria, siguiendo el mismo
// patrón ya establecido de pequeños primitivos reutilizables en
// `components/ui/` (Input, Button, Badge...). No instala ninguna
// dependencia nueva — `lucide-react` ya es una dependencia existente
// (usada en Dialog/EmptyState/LoadingState/Home).
//
// `type="button"` explícito: dentro de un <form>, un <button> sin type
// por defecto es "submit" — sin esto, pulsar el icono enviaría el
// formulario accidentalmente (requisito explícito de este bloque).
type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
