const MICROSOFT_MULTI_TENANT_AUTHORITIES = ["common", "organizations", "consumers"];
const MICROSOFT_TENANT_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/i;

/**
 * Returns the Microsoft Entra tenant (directory GUID or verified domain) to authenticate against.
 * Without a configured value the multi-tenant "common" authority is kept; a malformed value is
 * rejected instead of silently widening sign-in to every Microsoft directory.
 */
export const resolveMicrosoftTenant = (tenantId?: string | null) => {
  const value = tenantId?.trim();

  if (!value) return "common";

  if (
    MICROSOFT_MULTI_TENANT_AUTHORITIES.includes(value.toLowerCase()) ||
    MICROSOFT_TENANT_PATTERN.test(value)
  ) {
    return value;
  }

  throw new Error("MICROSOFT_TENANT_ID must be a directory GUID or a verified domain name");
};

export const buildMicrosoftAuthority = (tenantId?: string | null) =>
  `https://login.microsoftonline.com/${encodeURIComponent(resolveMicrosoftTenant(tenantId))}/oauth2/v2.0`;
