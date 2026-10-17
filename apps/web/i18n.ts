import { SUPPORTED_LANGUAGES } from "@repo/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import csTranslations from "app/locales/cs/translation.json";
import deTranslations from "app/locales/de/translation.json";
import enTranslations from "app/locales/en/translation.json";
import esTranslations from "app/locales/es/translation.json";
import frTranslations from "app/locales/fr/translation.json";
import ltTranslations from "app/locales/lt/translation.json";
import plTranslations from "app/locales/pl/translation.json";
import ptAOTranslations from "app/locales/pt-AO/translation.json";
import { detectBrowserLanguage } from "app/utils/browser-language";

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  fallbackLng: SUPPORTED_LANGUAGES.EN,
  lng: import.meta.env.VITE_E2E === "true" ? "en" : detectBrowserLanguage(),
  supportedLngs: Object.values(SUPPORTED_LANGUAGES),
  load: "currentOnly",
  ns: ["translation"],
  defaultNS: "translation",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    [SUPPORTED_LANGUAGES.PT_AO]: { translation: ptAOTranslations },
    en: {
      translation: enTranslations,
    },
    pl: {
      translation: plTranslations,
    },
    de: {
      translation: deTranslations,
    },
    lt: {
      translation: ltTranslations,
    },
    cs: {
      translation: csTranslations,
    },
    es: {
      translation: esTranslations,
    },
    fr: {
      translation: frTranslations,
    },
  },
});

export default i18n;
