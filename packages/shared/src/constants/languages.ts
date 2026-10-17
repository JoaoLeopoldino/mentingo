export const SUPPORTED_LANGUAGES = {
  EN: "en",
  PL: "pl",
  DE: "de",
  LT: "lt",
  CS: "cs",
  ES: "es",
  FR: "fr",
  PT_AO: "pt-AO",
} as const;

export type SupportedLanguages = (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];

const SUPPORTED_LANGUAGE_VALUES = new Set<string>(Object.values(SUPPORTED_LANGUAGES));

export const isSupportedLanguage = (language: string): language is SupportedLanguages =>
  SUPPORTED_LANGUAGE_VALUES.has(language);

/** Keep untranslated channels operational when a new interface locale is introduced. */
export const withEnglishLanguageFallback = <T>(
  translations: { en: T } & Partial<Record<SupportedLanguages, T>>,
): Record<SupportedLanguages, T> =>
  Object.fromEntries(
    Object.values(SUPPORTED_LANGUAGES).map((language) => [
      language,
      translations[language] === undefined ? translations.en : translations[language],
    ]),
  ) as Record<SupportedLanguages, T>;

/** Resolve a preference without weakening the exact canonical-language type guard. */
export const normalizeSupportedLanguage = (
  language: string | null | undefined,
): SupportedLanguages | undefined => {
  if (!language?.trim()) return undefined;

  let canonical: string;
  try {
    [canonical] = Intl.getCanonicalLocales(language.trim().replace(/_/g, "-"));
  } catch {
    return undefined;
  }

  if (isSupportedLanguage(canonical)) return canonical;

  const baseLanguage = canonical.split("-")[0];
  // Angola is currently the only Portuguese translation offered by the platform.
  if (baseLanguage === "pt") return SUPPORTED_LANGUAGES.PT_AO;

  return Object.values(SUPPORTED_LANGUAGES).find((value) => value === baseLanguage);
};
