const LINKEDIN_ADD_TO_PROFILE_URL = "https://www.linkedin.com/profile/add";

type LinkedinAddToProfileParams = {
  name?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  certId: string;
  certUrl: string;
  issuedAt: string | Date;
  expiresAt?: string | Date | null;
};

const toYearMonth = (value: string | Date) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return { year: String(date.getUTCFullYear()), month: String(date.getUTCMonth() + 1) };
};

export const buildLinkedinAddToProfileUrl = ({
  name,
  organizationId,
  organizationName,
  certId,
  certUrl,
  issuedAt,
  expiresAt,
}: LinkedinAddToProfileParams): string => {
  const url = new URL(LINKEDIN_ADD_TO_PROFILE_URL);

  url.searchParams.set("startTask", "CERTIFICATION_NAME");
  if (name) url.searchParams.set("name", name);
  // LinkedIn accepts either organizationId or organizationName, never both.
  if (organizationId) {
    url.searchParams.set("organizationId", organizationId);
  } else if (organizationName) {
    url.searchParams.set("organizationName", organizationName);
  }

  const issued = toYearMonth(issuedAt);
  if (issued) {
    url.searchParams.set("issueYear", issued.year);
    url.searchParams.set("issueMonth", issued.month);
  }

  const expires = expiresAt ? toYearMonth(expiresAt) : null;
  if (expires) {
    url.searchParams.set("expirationYear", expires.year);
    url.searchParams.set("expirationMonth", expires.month);
  }

  url.searchParams.set("certId", certId);
  url.searchParams.set("certUrl", certUrl);

  return url.toString();
};
