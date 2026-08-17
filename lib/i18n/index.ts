import { en } from "./en";
import { es } from "./es";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./types";
import type { Dictionary, Locale, TranslationKey } from "./types";

export type { Dictionary, Locale, TranslationKey } from "./types";
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./types";

const dictionaries: Record<Locale, Dictionary> = { es, en };

// Locale sin soportar (o ausente) => DEFAULT_LOCALE. No lanza error: esta
// función es el único punto que después leerá `profiles.locale`, por lo
// que debe tolerar cualquier valor que llegue de fuera del sistema de tipos.
export function resolveLocale(locale?: string | null): Locale {
  if (locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return locale as Locale;
  }
  return DEFAULT_LOCALE;
}

export function t(key: TranslationKey, locale?: string | null): string {
  return dictionaries[resolveLocale(locale)][key];
}
