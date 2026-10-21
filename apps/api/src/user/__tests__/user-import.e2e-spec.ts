import { inArray } from "drizzle-orm";

import { DB, DB_ADMIN } from "src/storage/db/db.providers";
import { groupUsers, users } from "src/storage/schema";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createGroupFactory } from "../../../test/factory/group.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { truncateAllTables } from "../../../test/helpers/test-helpers";
import { UserImportService } from "../services/user-import.service";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg } from "src/common";

describe("User bulk import (e2e)", () => {
  let app: INestApplication;
  let db: DatabasePg;
  let baseDb: DatabasePg;
  let userFactory: ReturnType<typeof createUserFactory>;
  let settingsFactory: ReturnType<typeof createSettingsFactory>;
  let groupFactory: ReturnType<typeof createGroupFactory>;
  let inTenant: <T>(fn: () => Promise<T>) => Promise<T>;
  let tenantId: string;
  const password = "password123";
  const provinces = ["Operações Luanda", "Operações Huíla", "Operações Benguela"];

  beforeAll(async () => {
    const { app: testApp, runAsTenant, defaultTenantId } = await createE2ETest();
    app = testApp;
    inTenant = (fn) => runAsTenant(defaultTenantId, fn);
    tenantId = defaultTenantId;
    db = app.get(DB);
    baseDb = app.get(DB_ADMIN);
    userFactory = createUserFactory(db);
    settingsFactory = createSettingsFactory(db);
    groupFactory = createGroupFactory(db);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await settingsFactory.create({ userId: null });
  });

  afterEach(async () => {
    await truncateAllTables(baseDb, db);
  }, 120000);

  it("imports 50 synthetic learners into provinces and reports duplicates and unknown groups", async () => {
    const admin = await userFactory
      .withCredentials({ password })
      .withAdminSettings(db)
      .withAdminRole()
      .create();

    const groups = [];
    for (const name of provinces) groups.push(await groupFactory.create({ name }));
    const existing = await userFactory.withCredentials({ password }).withUserSettings(db).create();

    const rows = ["firstName,lastName,email,role,groups,language"];
    for (let index = 1; index <= 50; index++) {
      const province = provinces[index % provinces.length];
      rows.push(`Colaborador,N${index},colab${index}@omatapalo.test,student,${province},pt-AO`);
    }
    rows.push("Repetido,Ficheiro,colab1@omatapalo.test,student,Operações Luanda,pt-AO");
    rows.push(`Repetido,Existente,${existing.email},student,Operações Huíla,pt-AO`);
    rows.push("Sem,Grupo,semgrupo@omatapalo.test,student,Operações Inexistente,pt-AO");

    // The HTTP upload pipe loads the ESM-only "file-type" package, which Jest cannot import; the
    // multipart wiring is covered by the Playwright spec (e2e/specs/users/import-users.spec.ts).
    const result = await inTenant(() =>
      app.get(UserImportService).importUsers(
        {
          originalname: "colaboradores.csv",
          mimetype: "text/csv",
          buffer: Buffer.from(rows.join("\n"), "utf8"),
        } as Express.Multer.File,
        { userId: admin.id, tenantId, role: "admin", permissions: [] } as never,
      ),
    );

    expect(result.importedUsersAmount).toBe(50);
    expect(result.skippedUsersAmount).toBe(3);
    expect(result.skippedUsersList.map(({ email, reason }) => [email, reason])).toEqual(
      expect.arrayContaining([
        ["colab1@omatapalo.test", "files.import.userFailReason.duplicateEmail"],
        [existing.email, "files.import.userFailReason.alreadyExists"],
        ["semgrupo@omatapalo.test", "files.import.userFailReason.unknownGroup"],
      ]),
    );

    const imported = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, Array.from({ length: 50 }, (_, i) => `colab${i + 1}@omatapalo.test`)));

    expect(imported).toHaveLength(50);

    const memberships = await db
      .select()
      .from(groupUsers)
      .where(
        inArray(
          groupUsers.userId,
          imported.map(({ id }) => id),
        ),
      );
    expect(memberships).toHaveLength(50);

    // Group-driven course enrolment is not asserted here: under Jest the outbox is disabled, so the
    // membership event fires inside the import transaction, before the users are committed. In a
    // running API it is delivered after commit; enrolment from group membership is covered by
    // group.controller.e2e-spec.ts.
  });
});
