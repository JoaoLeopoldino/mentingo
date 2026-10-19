import { SUPPORTED_LANGUAGES, type SupportedLanguages } from "@repo/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CertificateContent from "./CertificateContent";

describe("CertificateContent", () => {
  it("marks the demo preview and renders the supplied tenant issuer", () => {
    vi.stubEnv("VITE_DEMONSTRATION_MODE", "true");
    try {
      const {unmount} = render(<CertificateContent isDownload platformName="Emissor fictício" lang="pt-AO" />);
      expect(screen.getByRole("note")).toHaveTextContent("DEMONSTRAÇÃO — SEM VALIDADE");
      expect(screen.getByText("Emissor fictício")).toBeInTheDocument();
      unmount();
    } finally { vi.unstubAllEnvs(); }
  });
  it("renders certificate copy in every supported language", () => {
    const expectedLabels = {
      [SUPPORTED_LANGUAGES.PT_AO]: "CERTIFICA-SE QUE",
      [SUPPORTED_LANGUAGES.EN]: "THIS IS TO CERTIFY THAT",
      [SUPPORTED_LANGUAGES.PL]: "NINIEJSZYM ZAŚWIADCZA SIĘ, ŻE",
      [SUPPORTED_LANGUAGES.DE]: "HIERMIT WIRD BESTÄTIGT, DASS",
      [SUPPORTED_LANGUAGES.LT]: "ŠIUO PATVIRTINAMA, KAD",
      [SUPPORTED_LANGUAGES.CS]: "TÍMTO SE POTVRZUJE, ŽE",
      [SUPPORTED_LANGUAGES.ES]: "SE CERTIFICA QUE",
      [SUPPORTED_LANGUAGES.FR]: "CECI CERTIFIE QUE",
    };

    for (const [language, label] of Object.entries(expectedLabels)) {
      const { unmount } = render(
        <CertificateContent
          isDownload
          lang={language as SupportedLanguages}
          studentName="Ada Lovelace"
          courseName="Analytical Engines"
          completionDate="30.06.2026"
        />,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
