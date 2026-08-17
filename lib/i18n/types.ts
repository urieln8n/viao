import { es } from "./es";

export type Locale = "es" | "en";

export type TranslationKey = keyof typeof es;

export type Dictionary = Record<TranslationKey, string>;

export const SUPPORTED_LOCALES: readonly Locale[] = ["es", "en"];

export const DEFAULT_LOCALE: Locale = "es";
