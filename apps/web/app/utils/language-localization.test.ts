import { createInstance } from "i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { languageOptions } from "~/components/LanguageSelector/languageOptions";
import enTranslations from "~/locales/en/translation.json";
import ptAOTranslations from "~/locales/pt-AO/translation.json";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";

import { detectBrowserLanguage } from "./browser-language";
import { formatLocalizedDate } from "./formatLocalizedDate";
import { getDateLocale } from "./getDateLocale";

const originalLanguage = useLanguageStore.getState().language;
afterEach(() => {
  vi.unstubAllGlobals();
  useLanguageStore.setState({ language: originalLanguage });
  localStorage.clear();
});

describe("Angola interface language", () => {
  it("uses the first supported browser preference, including Portuguese regional variants", () => {
    vi.stubGlobal("navigator", { languages: ["zz-ZZ", "pt-PT", "en"], language: "pt-PT" });
    expect(detectBrowserLanguage()).toBe("pt-AO");
  });

  it("keeps English as the server and unsupported-browser fallback", () => {
    vi.stubGlobal("navigator", undefined);
    expect(detectBrowserLanguage()).toBe("en");
    vi.stubGlobal("navigator", { language: "zz-ZZ" });
    expect(detectBrowserLanguage()).toBe("en");
  });

  it("persists a selected preference and prioritizes the account preference", () => {
    useLanguageStore.getState().setLanguage("pt-AO");
    expect(JSON.parse(localStorage.getItem("language-storage")!).state.language).toBe("pt-AO");
    const savedPreference = localStorage.getItem("language-storage")!;
    useLanguageStore.setState({ language: "en" });
    localStorage.setItem("language-storage", savedPreference);
    useLanguageStore.persist.rehydrate();
    expect(useLanguageStore.getState().language).toBe("pt-AO");
    expect(useLanguageStore.getState().initializeLanguage("pt_PT")).toBe("pt-AO");
    expect(useLanguageStore.getState().initializeLanguage("de-DE")).toBe("de");
  });

  it("offers Angola exactly once in the existing content selector", () => {
    const option = languageOptions.filter(({ key }) => key === "pt-AO");
    expect(option).toHaveLength(1);
    expect(option[0].translationKey).toBe("changeUserLanguageView.options.angolanPortuguese");
  });

  it("renders Angola text, interpolation and the actual English fallback", async () => {
    const instance = createInstance();
    await instance.init({
      lng: "pt-AO",
      fallbackLng: "en",
      resources: {
        en: { translation: { ...enTranslations, fallbackProbe: "English fallback" } },
        "pt-AO": { translation: ptAOTranslations },
      },
    });
    expect(instance.t("common.languages.pt-AO")).toBe("Português (Angola)");
    expect(instance.t("fallbackProbe")).toBe("English fallback");
    expect(instance.t("dashboardHome.edit.drag", { title: "Luanda" })).toBe("Mover Luanda");
    expect(instance.t("studentCoursesView.modernView.lessonsCount", { count: 1 })).toBe("1 lição");
    expect(instance.t("studentCoursesView.modernView.lessonsCount", { count: 2 })).toBe("2 lições");
  });

  it("uses Portuguese date names and Luanda timezone for timestamp displays", () => {
    expect(getDateLocale("pt-AO").code).toBe("pt");
    expect(formatLocalizedDate("pt-AO", "2026-10-17T23:30:00Z")).toBe("18/10/2026, 00:30");
    expect(formatLocalizedDate("pt-AO", "invalid")).toBe("—");
  });
});
