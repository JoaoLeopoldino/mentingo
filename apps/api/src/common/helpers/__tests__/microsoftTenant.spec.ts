import { buildMicrosoftAuthority, resolveMicrosoftTenant } from "../microsoftTenant";

describe("resolveMicrosoftTenant", () => {
  it("keeps the multi-tenant authority when nothing is configured", () => {
    expect(resolveMicrosoftTenant(undefined)).toBe("common");
    expect(resolveMicrosoftTenant("  ")).toBe("common");
  });

  it("accepts a directory GUID or a verified domain", () => {
    expect(resolveMicrosoftTenant("0b4f7a3c-1d2e-4f50-9a6b-123456789abc")).toBe(
      "0b4f7a3c-1d2e-4f50-9a6b-123456789abc",
    );
    expect(resolveMicrosoftTenant("omatapalo.onmicrosoft.com")).toBe("omatapalo.onmicrosoft.com");
  });

  it("rejects values that could alter the authority URL", () => {
    expect(() => resolveMicrosoftTenant("evil.com/../x")).toThrow();
    expect(() => resolveMicrosoftTenant("a b")).toThrow();
    expect(() => resolveMicrosoftTenant("localhost")).toThrow();
  });

  it("builds the authority URL from the tenant", () => {
    expect(buildMicrosoftAuthority("omatapalo.onmicrosoft.com")).toBe(
      "https://login.microsoftonline.com/omatapalo.onmicrosoft.com/oauth2/v2.0",
    );
  });
});
