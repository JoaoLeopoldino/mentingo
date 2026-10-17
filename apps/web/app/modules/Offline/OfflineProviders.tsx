import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import i18n from "i18n";
import { queryClient } from "~/api/queryClient";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";

export function OfflineProviders({ children }: { children: React.ReactNode }) {
  const language = useLanguageStore((state) => state.language);
  useEffect(() => {
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [language]);
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}
