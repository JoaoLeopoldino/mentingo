import { buildCertificateMarkup } from "@repo/shared";

// Server callers, rather than learner-supplied options, select demonstration mode.
describe("certificate white-label rendering", () => {
  it("escapes the configured issuer and learner while retaining a mandatory demo notice", () => {
    const html = buildCertificateMarkup({
      platformName: "Utu <script>alert(1)</script>",
      studentName: '<img onerror="alert(1)">',
      lang: "pt-AO",
      demonstration: true,
    });
    expect(html).toContain("DEMONSTRAÇÃO — SEM VALIDADE");
    expect(html).toContain("Utu &lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img onerror=");
  });

  it("includes issuer text alongside a custom logo", () => {
    const html = buildCertificateMarkup({
      platformName: "Instituição fictícia",
      platformLogoUrl: "https://example.com/logo.png",
      demonstration: true,
    });
    expect(html).toContain("Instituição fictícia");
    expect(html).toContain("DEMONSTRAÇÃO — SEM VALIDADE");
  });

  it("does not label an ordinary upstream render as a demonstration", () => {
    expect(buildCertificateMarkup({})).not.toContain("DEMONSTRAÇÃO — SEM VALIDADE");
  });
});
