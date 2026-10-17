import { withEnglishLanguageFallback } from "@repo/shared";

import type { SupportedLanguages } from "@repo/shared/";

export function getLocalizedUserMentionTitleAnnouncement(mentioningUserFullName: string) {
  const title: Record<SupportedLanguages, string> = withEnglishLanguageFallback({
    en: `${mentioningUserFullName} mentioned you`,
    pl: `${mentioningUserFullName} wspomniał o Tobie`,
    de: `${mentioningUserFullName} hat dich erwähnt`,
    lt: `${mentioningUserFullName} paminėjo jus`,
    cs: `${mentioningUserFullName} vás zmínil`,
    es: `${mentioningUserFullName} te mencionó`,
    fr: `${mentioningUserFullName} vous a mentionné(e)`,
  });
  return title;
}
