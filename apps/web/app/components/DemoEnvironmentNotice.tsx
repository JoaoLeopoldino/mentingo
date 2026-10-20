import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * The notice is rendered inside the document Layout, which is pre-rendered at build time in English.
 * The first client render must therefore produce exactly the same text, otherwise React reports a
 * hydration mismatch and the whole page stays blank. The active language is applied after hydration.
 */
export function DemoEnvironmentNotice() {
  const { t, i18n } = useTranslation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const notice = hydrated
    ? t("demo.environmentNotice")
    : i18n.getFixedT("en")("demo.environmentNotice");

  return (
    <div
      role="note"
      className="border-b bg-muted px-4 py-2 text-center text-sm font-semibold text-foreground"
    >
      {notice}
    </div>
  );
}
