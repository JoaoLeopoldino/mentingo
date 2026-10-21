import {
  MicrosoftGraphApiClient,
  MicrosoftGraphError,
} from "../clients/microsoft-graph-api.client";

describe("MicrosoftGraphApiClient configuration", () => {
  const envService = {
    getEnv: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const client = new MicrosoftGraphApiClient(envService as never, configService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEnv = (values: Record<string, string>) =>
    envService.getEnv.mockImplementation((name: string) =>
      name in values
        ? Promise.resolve({ name, value: values[name] })
        : Promise.reject(new Error("Secret not found")),
    );

  it("uses tenant-managed secrets for the authorization URL", async () => {
    mockEnv({
      MICROSOFT_CALENDAR_CLIENT_ID: "tenant-calendar-client-id",
      MICROSOFT_CALENDAR_CLIENT_SECRET: "tenant-secret",
    });

    const authorizationUrl = await client.getAuthorizationUrl(
      "signed-state",
      "https://tenant.example.com/api/auth/microsoft-calendar/callback",
    );

    expect(new URL(authorizationUrl).searchParams.get("client_id")).toBe(
      "tenant-calendar-client-id",
    );
    expect(envService.getEnv).toHaveBeenCalledWith("MICROSOFT_CALENDAR_CLIENT_ID");
    expect(envService.getEnv).toHaveBeenCalledWith("MICROSOFT_CALENDAR_CLIENT_SECRET");
    expect(configService.get).not.toHaveBeenCalled();
  });

  it("does not fall back to deployment configuration when tenant secrets are missing", async () => {
    envService.getEnv.mockRejectedValue(new Error("Secret not found"));
    configService.get.mockReturnValue("deployment-calendar-credential");

    await expect(client.isConfigured()).resolves.toBe(false);
    await expect(
      client.getAuthorizationUrl(
        "signed-state",
        "https://tenant.example.com/api/auth/microsoft-calendar/callback",
      ),
    ).rejects.toThrow(new MicrosoftGraphError("Microsoft Calendar is not configured"));
    expect(configService.get).not.toHaveBeenCalled();
  });

  it("authorizes against the organization's Entra tenant when one is configured", async () => {
    mockEnv({
      MICROSOFT_CALENDAR_CLIENT_ID: "client-id",
      MICROSOFT_CALENDAR_CLIENT_SECRET: "secret",
      MICROSOFT_TENANT_ID: "omatapalo.onmicrosoft.com",
    });

    const url = new URL(
      await client.getAuthorizationUrl("state", "https://tenant.example.com/callback"),
    );

    expect(url.pathname).toBe("/omatapalo.onmicrosoft.com/oauth2/v2.0/authorize");
  });

  it("falls back to the multi-tenant authority and rejects a malformed tenant", async () => {
    mockEnv({ MICROSOFT_CALENDAR_CLIENT_ID: "client-id", MICROSOFT_CALENDAR_CLIENT_SECRET: "secret" });

    const url = new URL(
      await client.getAuthorizationUrl("state", "https://tenant.example.com/callback"),
    );
    expect(url.pathname).toBe("/common/oauth2/v2.0/authorize");

    mockEnv({
      MICROSOFT_CALENDAR_CLIENT_ID: "client-id",
      MICROSOFT_CALENDAR_CLIENT_SECRET: "secret",
      MICROSOFT_TENANT_ID: "evil.com/../x",
    });
    await expect(
      client.getAuthorizationUrl("state", "https://tenant.example.com/callback"),
    ).rejects.toThrow();
  });

  it("requests the Teams scope only when the organization enabled Teams meetings", async () => {
    const base = { MICROSOFT_CALENDAR_CLIENT_ID: "client-id", MICROSOFT_CALENDAR_CLIENT_SECRET: "secret" };
    const scopeFor = async () =>
      new URL(await client.getAuthorizationUrl("state", "https://tenant.example.com/callback"))
        .searchParams.get("scope");

    mockEnv(base);
    expect(await scopeFor()).not.toContain("OnlineMeetings.ReadWrite");
    await expect(client.isTeamsMeetingsEnabled()).resolves.toBe(false);

    mockEnv({ ...base, MICROSOFT_TEAMS_MEETINGS_ENABLED: "true" });
    expect(await scopeFor()).toContain("OnlineMeetings.ReadWrite");
    await expect(client.isTeamsMeetingsEnabled()).resolves.toBe(true);
  });
});
