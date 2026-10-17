import { normalizeSupportedLanguage } from "@repo/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { detectBrowserLanguage } from "../../../../utils/browser-language";

import type { SupportedLanguages } from "@repo/shared";

type LanguageStore = {
  language: SupportedLanguages;
  setLanguage: (lang: SupportedLanguages) => void;
  initializeLanguage: (applicationLang?: string | null) => SupportedLanguages;
};

function getDefaultLanguage(): SupportedLanguages {
  return detectBrowserLanguage();
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: getDefaultLanguage(),
      setLanguage: (lang) => set({ language: lang }),
      initializeLanguage: (applicationLang) => {
        const currentState = get();

        const preferredLanguage = normalizeSupportedLanguage(applicationLang);
        if (preferredLanguage) {
          set({ language: preferredLanguage });
          return preferredLanguage;
        }

        const storedLanguage = normalizeSupportedLanguage(currentState.language);
        if (storedLanguage) {
          set({ language: storedLanguage });
          return storedLanguage;
        }

        const browserLang = detectBrowserLanguage();
        set({ language: browserLang });
        return browserLang;
      },
    }),
    {
      name: "language-storage",
    },
  ),
);
