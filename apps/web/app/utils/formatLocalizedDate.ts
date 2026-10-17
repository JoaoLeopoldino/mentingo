import {
  formatAngolaDateTime,
  normalizeSupportedLanguage,
  SUPPORTED_LANGUAGES,
} from "@repo/shared";
import { format, isValid, parseISO } from "date-fns";

import { getDateLocale } from "./getDateLocale";

export function formatLocalizedDate(
  language: string,
  date: Date | string | number | null | undefined,
  pattern = "dd MMM yyyy, HH:mm",
): string {
  if (date == null) return "—";

  const parsedDate = typeof date === "string" ? parseISO(date) : new Date(date);

  if (!isValid(parsedDate)) return "—";

  if (
    normalizeSupportedLanguage(language) === SUPPORTED_LANGUAGES.PT_AO &&
    ["dd MMM yyyy, HH:mm", "dd MMM yyyy, HH:mm:ss"].includes(pattern)
  ) {
    return formatAngolaDateTime(parsedDate, pattern.endsWith(":ss"));
  }

  return format(parsedDate, pattern, { locale: getDateLocale(language) });
}
