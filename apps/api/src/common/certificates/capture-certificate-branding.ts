import { NotFoundException } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";

import { courses, learningPaths, settings } from "src/storage/schema";

import type {
  CertificateBrandingSnapshot,
  CertificateBrandingSource,
} from "./certificate-branding.types";
import type { DatabasePg } from "src/common";
import type { GlobalSettingsJSONContentSchema } from "src/settings/schemas/settings.schema";

/** Uses the caller's tenant-scoped transaction, never DB_ADMIN. No object mutation. */
export async function captureCertificateBranding(
  db: DatabasePg,
  source: CertificateBrandingSource,
): Promise<CertificateBrandingSnapshot> {
  const table = source.kind === "course" ? courses : learningPaths;
  const [record] = await db
    .select({
      configuration: sql<GlobalSettingsJSONContentSchema>`${settings.settings}`,
      signatureKey: sql<string | null>`${table.settings}->>'certificateSignature'`,
      fontColor: sql<string | null>`${table.settings}->>'certificateFontColor'`,
    })
    .from(table)
    .innerJoin(settings, and(eq(settings.tenantId, table.tenantId), isNull(settings.userId)))
    .where(eq(table.id, source.id))
    .limit(1);
  if (!record)
    throw new NotFoundException("studentCertificateView.informations.certificateNotFound");
  const configuration = record.configuration;
  return {
    version: 1,
    issuer:
      configuration.companyInformation?.certificateIssuer ||
      configuration.companyInformation?.companyName ||
      "Utu Lab",
    logoKey: configuration.platformLogoS3Key ?? null,
    backgroundKey: configuration.certificateBackgroundImage ?? null,
    signatureKey: record.signatureKey ?? null,
    fontColor: record.fontColor ?? null,
    primaryColor: configuration.primaryColor ?? null,
    demonstration: process.env.DEMONSTRATION_MODE === "true",
    capturedAt: new Date().toISOString(),
  };
}
