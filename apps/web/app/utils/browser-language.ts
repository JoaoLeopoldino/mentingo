import {
  normalizeSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguages,
} from "@repo/shared";

export type SupportedLanguage = SupportedLanguages;
export { isSupportedLanguage } from "@repo/shared";

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") return SUPPORTED_LANGUAGES.EN;

  const preferences = [
    ...(navigator.languages ?? []),
    navigator.language,
    (navigator as Navigator & { userLanguage?: string }).userLanguage,
  ];
  for (const preference of preferences) {
    const language = normalizeSupportedLanguage(preference);
    if (language) return language;
  }
  return SUPPORTED_LANGUAGES.EN;
}
