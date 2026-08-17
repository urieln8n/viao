import type { Dictionary } from "./types";

export const en = {
  "nav.search": "Search",
  "nav.trips": "My trip",
  "nav.rewards": "Wallet",
  "nav.profile": "Profile",
  "i18nDemo.title": "Language test",
  "i18nDemo.description":
    "This sample text shows that the same components render different content depending on the selected language, without duplicating structure or layout.",
  "i18nDemo.languageLabel": "Language",
  "i18nDemo.spanishOption": "Español",
  "i18nDemo.englishOption": "English",
  "i18nDemo.navSectionTitle": "Navigation texts (example)",
  "i18nDemo.fallbackSectionTitle": "Fallback test (unsupported locale)",
  "i18nDemo.fallbackDescription":
    'When resolving an unsupported locale (e.g. "de"), Spanish is used as a safe fallback without throwing errors.',
} satisfies Dictionary;
