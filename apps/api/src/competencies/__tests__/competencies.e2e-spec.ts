import { randomUUID } from "node:crypto";

import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { eq } from "drizzle-orm";
import request from "supertest";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";
import { competencyEvidence, groupManagerGroups, tenants, competencies } from "src/storage/schema";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createGroupFactory } from "../../../test/factory/group.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { assignSystemRoleToUserInTests } from "../../../test/helpers/permission-role-helpers";
import { cookieFor } from "../../../test/helpers/test-helpers";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg } from "src/common";

describe("Enterprise competencies with real tenant RLS", () => {
  let app: INestApplication;
  let db: DatabasePg;
  let dbAdmin: DatabasePg;
  let adminCookie: string;
  let managerCookie: string;
  let employeeCookie: string;
  let employeeId: string;
  let outsiderId: string;
  let managerId: string;
  let unitId: string;
  beforeAll(async () => {
    const context = await createE2ETest({ useDbProxy: true });
    app = context.app;
    db = context.db;
    dbAdmin = context.dbAdmin;
    await createSettingsFactory(db).create();
    const factory = createUserFactory(db);
    const admin = await factory
      .withAdminSettings(db)
      .withCredentials({ password: "password123" })
      .create();
    const manager = await factory
      .withUserSettings(db)
      .withCredentials({ password: "password123" })
      .create({ roleSlug: SYSTEM_ROLE_SLUGS.GROUP_MANAGER, firstName: "Gestor Luanda" });
    const employee = await factory
      .withUserSettings(db)
      .withCredentials({ password: "password123" })
      .create({ firstName: "Colaborador Luanda" });
    const outsider = await factory
      .withUserSettings(db)
      .withCredentials({ password: "password123" })
      .create({ firstName: "Colaborador Benguela" });
    employeeId = employee.id;
    outsiderId = outsider.id;
    managerId = manager.id;
    const unit = await createGroupFactory(db)
      .withMembers([employee.id])
      .create({ name: "Operações Luanda" });
    unitId = unit.id;
    await createGroupFactory(db).withMembers([outsider.id]).create({ name: "Operações Benguela" });
    await createGroupFactory(db).create({ name: "Operações Huíla" });
    await db.insert(groupManagerGroups).values({ managerUserId: manager.id, groupId: unit.id });
    await assignSystemRoleToUserInTests(
      db,
      manager.id,
      manager.tenantId,
      SYSTEM_ROLE_SLUGS.GROUP_MANAGER,
    );
    adminCookie = await cookieFor(admin, app);
    managerCookie = await cookieFor(manager, app);
    employeeCookie = await cookieFor(employee, app);
  }, 120000);
  afterAll(async () => {
    if (app) await app.close();
  });
  const workspace = (cookie: string, userId?: string) =>
    request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query(userId ? { userId } : {})
      .set("Cookie", cookie);
  const create = async () => {
    const response = await request(app.getHttpServer())
      .post("/api/competencies/catalog")
      .set("Cookie", adminCookie)
      .send({
        code: randomUUID().toUpperCase(),
        name: "Segurança no trabalho",
        category: "Segurança",
        description: "Observação profissional",
        levels: [
          { rank: 1, label: "Iniciado" },
          { rank: 2, label: "Autónomo" },
        ],
      })
      .expect(201);
    return response.body.data.id as string;
  };
  const evidence = (competencyId: string, status = "approved", userId = employeeId, level = 1) => ({
    userId,
    competencyId,
    level,
    status,
    source: "Observação presencial",
    evidence: "Verificação fictícia do uso de EPI em Luanda",
    expiresAt: null,
    reviewAt: null,
  });
  it("completes catalog → role → requirement → assignment → gap → assessment and history", async () => {
    const competencyId = await create();
    const role = await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Operador de obra" })
      .expect(201);
    await request(app.getHttpServer())
      .put("/api/competencies/requirements")
      .set("Cookie", adminCookie)
      .send({
        jobRoleId: role.body.data.id,
        competencyId,
        minimumLevel: 2,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
        courseId: null,
        learningPathId: null,
      })
      .expect(200);
    await request(app.getHttpServer())
      .put("/api/competencies/assignments")
      .set("Cookie", adminCookie)
      .send({ userId: employeeId, jobRoleId: role.body.data.id, organizationalUnitId: unitId })
      .expect(200);
    let result = await workspace(managerCookie, employeeId).expect(200);
    expect(
      result.body.data.matrix.find(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ),
    ).toMatchObject({ status: "missing", currentLevel: null });
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", employeeCookie)
      .send(evidence(competencyId, "pending"))
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId))
      .expect(201);
    result = await workspace(employeeCookie).expect(200);
    expect(
      result.body.data.matrix.find(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ),
    ).toMatchObject({ status: "insufficient", currentLevel: 1 });
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId, "approved", employeeId, 2))
      .expect(201);
    result = await workspace(employeeCookie).expect(200);
    expect(
      result.body.data.matrix.find(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ),
    ).toMatchObject({ status: "met", currentLevel: 2 });
    const records = result.body.data.evidence.filter(
      (x: { competencyId: string }) => x.competencyId === competencyId,
    );
    expect(records).toHaveLength(3);
    expect(records[0].assessorId).toBe(managerId);
    expect(records[0].assessedAt).toBeTruthy();
  });
  it("limits manager matrix to managed members and self", async () => {
    const result = await workspace(managerCookie).expect(200);
    expect(result.body.data.employees.map((x: { id: string }) => x.id)).toEqual(
      expect.arrayContaining([managerId, employeeId]),
    );
    expect(result.body.data.employees.map((x: { id: string }) => x.id)).not.toContain(outsiderId);
    await workspace(managerCookie, outsiderId).expect(403);
    const competencyId = await create();
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId, "approved", outsiderId))
      .expect(403);
  });
  it("prevents self certification and access to another employee", async () => {
    const competencyId = await create();
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", employeeCookie)
      .send(evidence(competencyId))
      .expect(403);
    await workspace(employeeCookie, outsiderId).expect(403);
    await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", employeeCookie)
      .send({ code: "EVIL", name: "Forbidden" })
      .expect(403);
  });
  it("rejects invalid levels, foreign unit membership and duplicate ranks", async () => {
    const competencyId = await create();
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId, "approved", employeeId, 20))
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/competencies/catalog")
      .set("Cookie", adminCookie)
      .send({
        code: "DUP",
        name: "Invalid",
        description: "",
        category: "Test",
        levels: [
          { rank: 1, label: "One" },
          { rank: 1, label: "Two" },
        ],
      })
      .expect(400);
    const role = await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Operador" })
      .expect(201);
    await request(app.getHttpServer())
      .put("/api/competencies/assignments")
      .set("Cookie", adminCookie)
      .send({ userId: outsiderId, jobRoleId: role.body.data.id, organizationalUnitId: unitId })
      .expect(400);
  });
  it("disables a competency without deleting evidence", async () => {
    const competencyId = await create();
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId))
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/competencies/catalog/${competencyId}`)
      .set("Cookie", adminCookie)
      .send({ active: false })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId))
      .expect(400);
    expect(
      (await workspace(employeeCookie)).body.data.evidence.some(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ),
    ).toBe(true);
  });
  it("enforces database RLS and append-only evidence under the application role", async () => {
    const competencyId = await create();
    const [tenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Other fictional tenant", host: `https://${randomUUID()}.local` })
      .returning();
    const [foreign] = await dbAdmin
      .insert(competencies)
      .values({ tenantId: tenant.id, code: "FOREIGN", name: "Foreign" })
      .returning();
    const runner = app.get(TenantDbRunnerService);
    const actorTenant = (
      await db.select().from(competencies).where(eq(competencies.id, competencyId))
    )[0].tenantId;
    await runner.runWithTenant(actorTenant, async () => {
      const tenantDb = app.get<DatabasePg>("DB");
      expect(
        await tenantDb.select().from(competencies).where(eq(competencies.id, foreign.id)),
      ).toHaveLength(0);
      await expect(
        tenantDb
          .insert(competencies)
          .values({ tenantId: tenant.id, code: "CROSS", name: "Forbidden" }),
      ).rejects.toThrow();
    });
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(foreign.id))
      .expect(400);
    const inserted = await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId))
      .expect(201);
    await runner.runWithTenant(actorTenant, async () => {
      const tenantDb = app.get<DatabasePg>("DB");
      expect(
        await tenantDb
          .delete(competencyEvidence)
          .where(eq(competencyEvidence.id, inserted.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .update(competencyEvidence)
          .set({ evidence: "tampered" })
          .where(eq(competencyEvidence.id, inserted.body.data.id))
          .returning(),
      ).toHaveLength(0);
    });
  });
});
