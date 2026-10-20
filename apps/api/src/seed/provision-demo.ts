/**
 * Provisions ONE restricted demonstration tenant on a freshly migrated database.
 *
 * Unlike seed-prod this never truncates tables and never creates default credentials. It is
 * idempotent, runs only in demonstration mode, and reads every secret from the environment of the
 * process that runs it (a one-shot job), so no password is printed or committed.
 *
 * Required environment:
 *   MIGRATOR_DATABASE_URL  owner connection (not the runtime role)
 *   DEMONSTRATION_MODE=true
 *   PROVISION_TENANT_HOST  tenant origin, e.g. https://demo.example.org
 *   PROVISION_TENANT_NAME
 *   PROVISION_BRAND_JSON   companyInformation JSON (organisation, issuer, footer, locale, ...)
 *   PROVISION_USERS_JSON   [{ email, firstName, lastName, role, passwordVar }]
 *   <passwordVar>          one environment variable per user, >= 20 characters
 */
import { SUPPORTED_LANGUAGES, SYSTEM_ROLE_SLUGS, type SystemRoleSlug } from "@repo/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import hashPassword from "../common/helpers/hashPassword";
import { credentials, settings, userDetails, users } from "../storage/schema";

import { insertGlobalSettings, insertOnboardingData, insertUserSettings } from "./seed";
import { assignSystemRoleToUser, ensureSeedTenant, seedSystemRolesForTenant } from "./seed-helpers";

import type { DatabasePg } from "../common";

type ProvisionUser = {
  email: string;
  firstName: string;
  lastName: string;
  role: SystemRoleSlug;
  passwordVar: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  if (process.env.DEMONSTRATION_MODE !== "true") {
    throw new Error("Refusing to provision: DEMONSTRATION_MODE must be true");
  }

  const host = required("PROVISION_TENANT_HOST");
  if (!/^https:\/\/[^\s/]+$/.test(host)) throw new Error("PROVISION_TENANT_HOST must be an https origin");

  const brand = JSON.parse(required("PROVISION_BRAND_JSON")) as Record<string, string>;
  const provisionUsers = JSON.parse(required("PROVISION_USERS_JSON")) as ProvisionUser[];
  const validRoles = new Set<string>(Object.values(SYSTEM_ROLE_SLUGS));

  for (const user of provisionUsers) {
    if (!validRoles.has(user.role)) throw new Error(`Unknown role for ${user.email}`);
    const password = process.env[user.passwordVar];
    if (!password || password.length < 20) {
      throw new Error(`${user.passwordVar} must be set with at least 20 characters`);
    }
  }

  const sqlConnection = postgres(required("MIGRATOR_DATABASE_URL"), { max: 1 });
  const db = drizzle(sqlConnection) as DatabasePg;

  try {
    const tenant = await ensureSeedTenant(db, {
      name: required("PROVISION_TENANT_NAME"),
      host,
      isManaging: true,
    });
    await seedSystemRolesForTenant(db, tenant.id);

    const [existingGlobal] = await db
      .select({ id: settings.id })
      .from(settings)
      .where(and(eq(settings.tenantId, tenant.id), isNull(settings.userId)));
    if (!existingGlobal) await insertGlobalSettings(db, tenant.id);

    // Invite-only registration, no anonymous catalogue access, branding from configuration.
    await db
      .update(settings)
      .set({
        settings: sql`${settings.settings} || ${JSON.stringify({
          inviteOnlyRegistration: true,
          unregisteredUserCoursesAccessibility: false,
          companyInformation: brand,
        })}::text::jsonb`,
      })
      .where(and(eq(settings.tenantId, tenant.id), isNull(settings.userId)));

    for (const entry of provisionUsers) {
      const email = entry.email.toLowerCase();
      const [existing] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenantId, tenant.id)));

      let userId = existing?.id;
      if (!existing) {
        const [created] = await db
          .insert(users)
          .values({
            email,
            firstName: entry.firstName,
            lastName: entry.lastName,
            tenantId: tenant.id,
          })
          .returning();
        userId = created.id;

        await db.insert(credentials).values({
          userId,
          tenantId: tenant.id,
          password: await hashPassword(process.env[entry.passwordVar] as string),
          requiresPasswordChange: true,
        });
        await insertOnboardingData(userId, tenant.id);
      }

      if (!userId) throw new Error("User id missing");

      if (entry.role === SYSTEM_ROLE_SLUGS.ADMIN || entry.role === SYSTEM_ROLE_SLUGS.CONTENT_CREATOR) {
        await db
          .insert(userDetails)
          .values({ userId, tenantId: tenant.id, contactEmail: email })
          .onConflictDoNothing({ target: userDetails.userId });
      }

      await assignSystemRoleToUser(db, userId, tenant.id, entry.role);
      await insertUserSettings(db, userId, tenant.id, entry.role === SYSTEM_ROLE_SLUGS.ADMIN);
      await db
        .update(settings)
        .set({
          settings: sql`${settings.settings} || ${JSON.stringify({
            language: brand.defaultLocale ?? SUPPORTED_LANGUAGES.EN,
          })}::text::jsonb`,
        })
        .where(and(eq(settings.userId, userId), eq(settings.tenantId, tenant.id)));
    }

    console.log(
      `Provisioned tenant ${host}: ${provisionUsers.length} users (${provisionUsers
        .map((user) => user.role)
        .join(", ")}). No seed data, no truncation, no default credentials.`,
    );
  } finally {
    await sqlConnection.end();
  }
}

main()
  .then(() => process.exit(0)) // seed.ts keeps its own connection open at import
  .catch((error) => {
  console.error("Provisioning failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
