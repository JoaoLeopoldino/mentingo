import { normalizeSupportedLanguage } from "@repo/shared";

import { useLanguageStore } from "../../modules/Dashboard/Settings/Language/LanguageStore";
import { useCurrentUser } from "../queries/useCurrentUser";
import { useUserSettings } from "../queries/useUserSettings";

export function useCurrentLanguage() {
  const { data: currentUser } = useCurrentUser();
  const { data: userSettings } = useUserSettings();
  const { language: fallbackLanguage } = useLanguageStore();

  const preferredLanguage = normalizeSupportedLanguage(userSettings?.language);

  if (currentUser) {
    return {
      language: preferredLanguage || fallbackLanguage,
      isFromDatabase: !!preferredLanguage,
      isFromLocalStorage: !preferredLanguage && !!fallbackLanguage,
      currentUser,
      userSettings,
    };
  }

  return {
    language: fallbackLanguage,
    isFromDatabase: false,
    isFromLocalStorage: !!fallbackLanguage,
    currentUser: undefined,
    userSettings: undefined,
  };
}
