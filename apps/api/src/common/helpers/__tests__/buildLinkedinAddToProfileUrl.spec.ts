import { buildLinkedinAddToProfileUrl } from "../buildLinkedinAddToProfileUrl";

describe("buildLinkedinAddToProfileUrl", () => {
  it("fills certification, issuer, dates, id and verification url", () => {
    const url = new URL(
      buildLinkedinAddToProfileUrl({
        name: "Safety Basics",
        organizationName: "Omatapalo",
        certId: "cert-1",
        certUrl: "https://tenant.example/api/certificates/share?certificateId=cert-1",
        issuedAt: "2026-03-15T10:00:00.000Z",
        expiresAt: "2027-03-15T10:00:00.000Z",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(url.searchParams.get("name")).toBe("Safety Basics");
    expect(url.searchParams.get("organizationName")).toBe("Omatapalo");
    expect(url.searchParams.has("organizationId")).toBe(false);
    expect(url.searchParams.get("issueYear")).toBe("2026");
    expect(url.searchParams.get("issueMonth")).toBe("3");
    expect(url.searchParams.get("expirationYear")).toBe("2027");
    expect(url.searchParams.get("expirationMonth")).toBe("3");
    expect(url.searchParams.get("certId")).toBe("cert-1");
    expect(url.searchParams.get("certUrl")).toContain("certificateId=cert-1");
  });

  it("prefers organizationId over organizationName, never sending both", () => {
    const url = new URL(
      buildLinkedinAddToProfileUrl({
        name: "Safety Basics",
        organizationId: "123456",
        organizationName: "Omatapalo",
        certId: "cert-1",
        certUrl: "https://tenant.example/share",
        issuedAt: "2026-03-15T10:00:00.000Z",
      }),
    );

    expect(url.searchParams.get("organizationId")).toBe("123456");
    expect(url.searchParams.has("organizationName")).toBe(false);
  });

  it("omits expiration when the certificate does not expire", () => {
    const url = new URL(
      buildLinkedinAddToProfileUrl({
        name: "Safety Basics",
        certId: "cert-1",
        certUrl: "https://tenant.example/share",
        issuedAt: "2026-03-15T10:00:00.000Z",
        expiresAt: null,
      }),
    );

    expect(url.searchParams.has("expirationYear")).toBe(false);
    expect(url.searchParams.has("expirationMonth")).toBe(false);
    expect(url.searchParams.has("organizationName")).toBe(false);
  });
});
