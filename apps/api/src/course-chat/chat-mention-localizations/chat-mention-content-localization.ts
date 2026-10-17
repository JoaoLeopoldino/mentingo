import { withEnglishLanguageFallback } from "@repo/shared";

import type { SupportedLanguages } from "@repo/shared";

export function getLocalizedUserMentionContentAnnouncement(
  courseNames: Record<SupportedLanguages, string>,
) {
  const content: Record<SupportedLanguages, string> = withEnglishLanguageFallback({
    en: `In the course "${courseNames.en}"`,
    pl: `W kursie "${courseNames.pl}"`,
    de: `Im Kurs "${courseNames.de}"`,
    lt: `Kurse "${courseNames.lt}"`,
    cs: `V kurzu "${courseNames.cs}"`,
    es: `En el curso "${courseNames.es}"`,
    fr: `Dans le cours « ${courseNames.fr} »`,
  });
  return content;
}
