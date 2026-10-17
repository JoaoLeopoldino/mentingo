import { normalizeSupportedLanguage, SUPPORTED_LANGUAGES } from "@repo/shared";
import { cs, de, enUS, es, fr, lt, pl, pt } from "date-fns/locale";
import { match } from "ts-pattern";

export function getDateLocale(language: string) {
  const locale = normalizeSupportedLanguage(language);

  return match(locale)
    .with(SUPPORTED_LANGUAGES.PT_AO, () => pt)
    .with(SUPPORTED_LANGUAGES.PL, () => pl)
    .with(SUPPORTED_LANGUAGES.DE, () => de)
    .with(SUPPORTED_LANGUAGES.CS, () => cs)
    .with(SUPPORTED_LANGUAGES.LT, () => lt)
    .with(SUPPORTED_LANGUAGES.ES, () => es)
    .with(SUPPORTED_LANGUAGES.FR, () => fr)
    .otherwise(() => enUS);
}
