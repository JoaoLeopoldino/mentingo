import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { renderToString } from "react-dom/server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";

import { DemoEnvironmentNotice } from "./DemoEnvironmentNotice";

const resources = {
  en: { translation: { demo: { environmentNotice: "Demonstration environment" } } },
  "pt-AO": { translation: { demo: { environmentNotice: "Ambiente de Demonstração" } } },
};

async function createI18n(lng: string) {
  const instance = createInstance();
  await instance.use(initReactI18next).init({ resources, lng, fallbackLng: "en" });
  return instance;
}

describe("DemoEnvironmentNotice", () => {
  it("renders the build-time (English) text first, whatever the browser language, to avoid a hydration mismatch", async () => {
    const i18n = await createI18n("pt-AO");
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <DemoEnvironmentNotice />
      </I18nextProvider>,
    );

    expect(html).toContain("Demonstration environment");
    expect(html).not.toContain("Ambiente de Demonstração");
  });

  it("switches to the active language after hydration", async () => {
    const i18n = await createI18n("pt-AO");
    render(
      <I18nextProvider i18n={i18n}>
        <DemoEnvironmentNotice />
      </I18nextProvider>,
    );

    expect(await screen.findByText("Ambiente de Demonstração")).toBeTruthy();
  });
});
