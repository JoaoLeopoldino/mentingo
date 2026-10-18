import { randomUUID } from "node:crypto";

import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { eq, sql } from "drizzle-orm";
import request from "supertest";

import { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";
import {
  users,
  competencyAssignments,
  competencyFrameworks,
  competencyRequirementVersions,
  competencyDevelopmentPlans,
  competencyPlanHistory,
  competencyAssessments,
  competencyEvidenceReviews,
  competencyRevocations,
  competencyEvidence,
  groupManagerGroups,
  tenants,
  competencies,
} from "src/storage/schema";

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
  let adminId: string;
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
    adminId = admin.id;
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
    const firstEvidence = await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId))
      .expect(201);
    const firstAssessment = await request(app.getHttpServer())
      .post("/api/competencies/assessments")
      .set("Cookie", managerCookie)
      .send({
        id: randomUUID(),
        userId: employeeId,
        competencyId,
        level: 1,
        expectedAssessmentId: null,
        sourceEvidenceId: firstEvidence.body.data.id,
        rationale: "Avaliação profissional explícita",
        expiresAt: null,
        reviewAt: null,
      })
      .expect(201);
    result = await workspace(employeeCookie).expect(200);
    expect(
      result.body.data.matrix.find(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ),
    ).toMatchObject({ status: "insufficient", currentLevel: 1 });
    const secondEvidence = await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send(evidence(competencyId, "approved", employeeId, 2))
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/competencies/assessments")
      .set("Cookie", managerCookie)
      .send({
        id: randomUUID(),
        userId: employeeId,
        competencyId,
        level: 2,
        expectedAssessmentId: firstAssessment.body.data.id,
        sourceEvidenceId: secondEvidence.body.data.id,
        rationale: "Reavaliação formal",
        expiresAt: null,
        reviewAt: null,
      })
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
    const assessment = await request(app.getHttpServer())
      .post("/api/competencies/assessments")
      .set("Cookie", managerCookie)
      .send({
        id: randomUUID(),
        userId: employeeId,
        competencyId,
        level: 1,
        expectedAssessmentId: null,
        sourceEvidenceId: inserted.body.data.id,
        rationale: "Avaliação RLS fictícia",
        expiresAt: null,
        reviewAt: null,
      })
      .expect(201);
    const review = await request(app.getHttpServer())
      .post("/api/competencies/evidence-reviews")
      .set("Cookie", managerCookie)
      .send({
        evidenceId: inserted.body.data.id,
        status: "approved",
        rationale: "Revisão RLS fictícia",
      })
      .expect(201);
    const restriction = await request(app.getHttpServer())
      .post("/api/competencies/revocations")
      .set("Cookie", managerCookie)
      .send({
        id: randomUUID(),
        assessmentId: assessment.body.data.id,
        kind: "suspended",
        reason: "Suspensão RLS fictícia",
        effectiveAt: new Date().toISOString(),
        endsAt: null,
      })
      .expect(201);
    await runner.runWithTenant(tenant.id, async () => {
      const tenantDb = app.get<DatabasePg>("DB");
      expect(
        await tenantDb
          .select()
          .from(competencyAssessments)
          .where(eq(competencyAssessments.id, assessment.body.data.id)),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .select()
          .from(competencyEvidenceReviews)
          .where(eq(competencyEvidenceReviews.id, review.body.data.id)),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .select()
          .from(competencyRevocations)
          .where(eq(competencyRevocations.id, restriction.body.data.id)),
      ).toHaveLength(0);
    });
    await runner.runWithTenant(actorTenant, async () => {
      const tenantDb = app.get<DatabasePg>("DB");
      expect(
        await tenantDb
          .delete(competencyAssessments)
          .where(eq(competencyAssessments.id, assessment.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .update(competencyAssessments)
          .set({ level: 2 })
          .where(eq(competencyAssessments.id, assessment.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .delete(competencyEvidenceReviews)
          .where(eq(competencyEvidenceReviews.id, review.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .update(competencyEvidenceReviews)
          .set({ status: "rejected" })
          .where(eq(competencyEvidenceReviews.id, review.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .delete(competencyRevocations)
          .where(eq(competencyRevocations.id, restriction.body.data.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await tenantDb
          .update(competencyRevocations)
          .set({ reason: "tampered" })
          .where(eq(competencyRevocations.id, restriction.body.data.id))
          .returning(),
      ).toHaveLength(0);
    });
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
  it("retains formal approval after evidence rejection and serializes concurrent reassessments", async () => {
    const competencyId = await create();
    const role = await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Operador avaliado" })
      .expect(201);
    await request(app.getHttpServer())
      .put("/api/competencies/requirements")
      .set("Cookie", adminCookie)
      .send({
        jobRoleId: role.body.data.id,
        competencyId,
        minimumLevel: 2,
        effectiveFrom: "2026-01-01T00:00:00Z",
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
    const command = {
      id: randomUUID(),
      userId: employeeId,
      competencyId,
      level: 2,
      expectedAssessmentId: null,
      sourceEvidenceId: null,
      rationale: "Observação profissional fundamentada",
      expiresAt: null,
      reviewAt: null,
    };
    const submit = (body: object, cookie = managerCookie) =>
      request(app.getHttpServer())
        .post("/api/competencies/assessments")
        .set("Cookie", cookie)
        .send(body);
    await submit(command).expect(201);
    const proof = await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", employeeCookie)
      .send(evidence(competencyId, "pending"))
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/competencies/evidence-reviews")
      .set("Cookie", managerCookie)
      .send({
        evidenceId: proof.body.data.id,
        status: "rejected",
        rationale: "Ficheiro sem fundamentação suficiente",
      })
      .expect(201);
    let data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(data.assessments.find((x: { id: string }) => x.id === command.id)).toMatchObject({
      level: 2,
    });
    expect(
      data.evidenceReviews.find((x: { evidenceId: string }) => x.evidenceId === proof.body.data.id)
        .status,
    ).toBe("rejected");
    expect(
      data.matrix.find((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toMatchObject({ status: "met", currentLevel: 2 });
    const replacements = [1, 2].map((level) => ({
      ...command,
      id: randomUUID(),
      level,
      expectedAssessmentId: command.id,
    }));
    const results = await Promise.all(replacements.map((body) => submit(body)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = replacements[results.findIndex((r) => r.status === 201)];
    await submit(winner).expect(201); // durable idempotency even after the head changed
    await submit({ ...winner, rationale: "Conflicting retry" }).expect(409);
    data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(
      data.assessments.filter((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toHaveLength(2);
    expect(
      data.assessments.find((x: { id: string }) => x.id === winner.id).supersedesAssessmentId,
    ).toBe(command.id);
    await submit({ ...command, id: randomUUID(), userId: outsiderId }).expect(403);
    await submit({ ...command, id: randomUUID() }, employeeCookie).expect(403);
    await request(app.getHttpServer())
      .post("/api/competencies/revocations")
      .set("Cookie", managerCookie)
      .send({
        id: randomUUID(),
        assessmentId: winner.id,
        kind: "revoked",
        reason: "Revogação profissional explícita e fictícia",
        effectiveAt: new Date().toISOString(),
        endsAt: null,
      })
      .expect(201);
    expect(
      (await workspace(employeeCookie).expect(200)).body.data.matrix.find(
        (x: { competencyId: string }) => x.competencyId === competencyId,
      ).status,
    ).toBe("revoked");
    expect((await workspace(employeeCookie).expect(200)).body.data.revocations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assessmentId: winner.id, kind: "revoked" }),
      ]),
    );
  });
  it("completes a development plan only after a separate evidence-backed professional assessment", async () => {
    const competencyId = await create();
    const planId = randomUUID();
    const createBody = {
      id: planId,
      userId: employeeId,
      competencyId,
      title: "Desenvolver utilização segura de EPI",
      targetLevel: 2,
      deadline: "2030-12-31T00:00:00Z",
      activities: [
        { title: "Formação e observação presencial", courseId: null, learningPathId: null },
      ],
    };
    const createPlan = (body = createBody, cookie = employeeCookie) =>
      request(app.getHttpServer())
        .post("/api/competencies/development-plans")
        .set("Cookie", cookie)
        .send(body);
    const list = (cookie = employeeCookie) =>
      request(app.getHttpServer()).get("/api/competencies/development-plans").set("Cookie", cookie);
    await createPlan().expect(201);
    await createPlan().expect(201);
    await createPlan({ ...createBody, title: "Conflicting retry" }).expect(409);
    await createPlan({ ...createBody, id: randomUUID(), userId: outsiderId }).expect(403);
    const command = (
      action: string,
      expectedVersion: number,
      cookie = employeeCookie,
      activityId: string | null = null,
      id = randomUUID(),
    ) =>
      request(app.getHttpServer())
        .post(`/api/competencies/development-plans/${planId}/decisions`)
        .set("Cookie", cookie)
        .send({
          id,
          action,
          expectedVersion,
          rationale: "Decisão fundamentada fictícia",
          activityId,
        });
    await command("request_approval", 1).expect(201);
    await command("approve", 2).expect(403);
    const approvalId = randomUUID();
    const concurrent = await Promise.all([
      command("approve", 2, managerCookie, null, approvalId),
      command("approve", 2, managerCookie),
    ]);
    expect(concurrent.map((x) => x.status).sort()).toEqual([201, 409]);
    await command("report_activity", 2).expect(409);
    let data = (await list().expect(200)).body.data;
    const activity = data.activities.find((x: { planId: string }) => x.planId === planId);
    await command("submit", 3).expect(400);
    await command("report_activity", 3, employeeCookie, activity.id).expect(201);
    expect(
      (await list().expect(200)).body.data.plans.find((x: { id: string }) => x.id === planId),
    ).toMatchObject({ state: "active", version: 4, responsibleId: managerId });
    await command("submit", 4).expect(201);
    await command("complete", 5, managerCookie).expect(400); // training/activity alone is not professional proficiency
    const proof = await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", employeeCookie)
      .send({ ...evidence(competencyId, "pending", employeeId, 2), developmentPlanId: planId })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/competencies/evidence-reviews")
      .set("Cookie", managerCookie)
      .send({
        evidenceId: proof.body.data.id,
        status: "approved",
        rationale: "Observação presencial confirmada",
      })
      .expect(201);
    const assessmentId = randomUUID();
    await request(app.getHttpServer())
      .post("/api/competencies/assessments")
      .set("Cookie", managerCookie)
      .send({
        id: assessmentId,
        userId: employeeId,
        competencyId,
        level: 2,
        expectedAssessmentId: null,
        sourceEvidenceId: proof.body.data.id,
        rationale: "Avaliação profissional independente do curso",
        expiresAt: null,
        reviewAt: null,
      })
      .expect(201);
    const completionId = randomUUID();
    await command("complete", 5, managerCookie, null, completionId).expect(201);
    await command("complete", 5, managerCookie, null, completionId).expect(201);
    data = (await list().expect(200)).body.data;
    expect(data.plans.find((x: { id: string }) => x.id === planId)).toMatchObject({
      state: "completed",
      version: 6,
      completedAssessmentId: assessmentId,
    });
    expect(data.history.filter((x: { planId: string }) => x.planId === planId)).toHaveLength(6);
    await command("cancel", 6).expect(400);
    await request(app.getHttpServer())
      .get("/api/competencies/development-plans")
      .query({ userId: outsiderId })
      .set("Cookie", managerCookie)
      .expect(403);
    const runner = app.get(TenantDbRunnerService);
    const [row] = await db
      .select()
      .from(competencyDevelopmentPlans)
      .where(eq(competencyDevelopmentPlans.id, planId));
    await runner.runWithTenant(row.tenantId, async () => {
      const scoped = app.get<DatabasePg>("DB");
      expect(
        await scoped
          .delete(competencyPlanHistory)
          .where(eq(competencyPlanHistory.planId, planId))
          .returning(),
      ).toHaveLength(0);
    });
    const [otherTenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Other plan tenant", host: `https://${randomUUID()}.local` })
      .returning();
    await runner.runWithTenant(otherTenant.id, async () => {
      const scoped = app.get<DatabasePg>("DB");
      expect(
        await scoped
          .select()
          .from(competencyDevelopmentPlans)
          .where(eq(competencyDevelopmentPlans.id, planId)),
      ).toHaveLength(0);
      expect(
        await scoped
          .select()
          .from(competencyPlanHistory)
          .where(eq(competencyPlanHistory.planId, planId)),
      ).toHaveLength(0);
    });
  });
  it("reuses immutable scales in frameworks and versions mandatory or optional professional requirements", async () => {
    const framework = await request(app.getHttpServer())
      .post("/api/competencies/frameworks")
      .set("Cookie", adminCookie)
      .send({
        code: randomUUID().toUpperCase(),
        name: "Operações Angola",
        description: "Luanda, Huíla e Benguela",
        categories: ["Segurança", "Operação"],
      })
      .expect(201);
    const levels = [
      { rank: 1, label: "Iniciado" },
      { rank: 2, label: "Autónomo" },
    ];
    const scale = await request(app.getHttpServer())
      .post("/api/competencies/scales")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Proficiência operacional", levels })
      .expect(201);
    const body = {
      code: randomUUID().toUpperCase(),
      name: "EPI com escala",
      description: "Avaliação profissional",
      category: "Segurança",
      levels,
      frameworkId: framework.body.data.id,
      scaleId: scale.body.data.id,
    };
    const catalog = await request(app.getHttpServer())
      .post("/api/competencies/catalog")
      .set("Cookie", adminCookie)
      .send(body)
      .expect(201);
    const competencyId = catalog.body.data.id;
    await request(app.getHttpServer())
      .post("/api/competencies/catalog")
      .set("Cookie", adminCookie)
      .send({ ...body, code: randomUUID().toUpperCase(), category: "Unknown category" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/competencies/catalog")
      .set("Cookie", adminCookie)
      .send({
        ...body,
        code: randomUUID().toUpperCase(),
        levels: [{ rank: 1, label: "Different scale" }],
      })
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/competencies/framework-setup")
      .set("Cookie", employeeCookie)
      .expect(403);
    const role = await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Técnico de segurança" })
      .expect(201);
    const rule = {
      jobRoleId: role.body.data.id,
      competencyId,
      minimumLevel: 1,
      mandatory: true,
      effectiveFrom: "2026-01-01T00:00:00Z",
      effectiveUntil: null,
      courseId: null,
      learningPathId: null,
    };
    const set = (payload: object) =>
      request(app.getHttpServer())
        .put("/api/competencies/requirements")
        .set("Cookie", adminCookie)
        .send(payload);
    const requirement = await set(rule).expect(200);
    const concurrent = await Promise.all([
      set({ ...rule, minimumLevel: 2, mandatory: false, expectedVersion: 1 }),
      set({ ...rule, minimumLevel: 2, mandatory: false, expectedVersion: 1 }),
    ]);
    expect(concurrent.map((x) => x.status).sort()).toEqual([200, 409]);
    await set(rule).expect(409);
    await request(app.getHttpServer())
      .put("/api/competencies/assignments")
      .set("Cookie", adminCookie)
      .send({ userId: employeeId, jobRoleId: role.body.data.id, organizationalUnitId: unitId })
      .expect(200);
    let data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(
      data.requirementHistory.filter(
        (x: { requirementId: string }) => x.requirementId === requirement.body.data.id,
      ),
    ).toHaveLength(2);
    expect(
      data.matrix.find((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toMatchObject({ requiredLevel: 2, mandatory: false });
    await set({
      ...rule,
      minimumLevel: 1,
      expectedVersion: 2,
      effectiveFrom: "2030-01-01T00:00:00Z",
    }).expect(200);
    data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(
      data.matrix.find((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toMatchObject({ requiredLevel: 2, mandatory: false });
    const runner = app.get(TenantDbRunnerService);
    const [row] = await db
      .select()
      .from(competencyFrameworks)
      .where(eq(competencyFrameworks.id, framework.body.data.id));
    await runner.runWithTenant(row.tenantId, async () => {
      const scoped = app.get<DatabasePg>("DB");
      expect(
        await scoped
          .update(competencyRequirementVersions)
          .set({ minimumLevel: 1 })
          .where(eq(competencyRequirementVersions.requirementId, requirement.body.data.id))
          .returning(),
      ).toHaveLength(0);
    });
    const [otherTenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Other framework tenant", host: `https://${randomUUID()}.local` })
      .returning();
    await runner.runWithTenant(otherTenant.id, async () => {
      const scoped = app.get<DatabasePg>("DB");
      expect(
        await scoped
          .select()
          .from(competencyFrameworks)
          .where(eq(competencyFrameworks.id, framework.body.data.id)),
      ).toHaveLength(0);
      expect(
        await scoped
          .select()
          .from(competencyRequirementVersions)
          .where(eq(competencyRequirementVersions.requirementId, requirement.body.data.id)),
      ).toHaveLength(0);
    });
  });
  it("combines two active jobs, enforces HR manager scope and preserves ended assignments", async () => {
    const competencyId = await create();
    const makeRole = () =>
      request(app.getHttpServer())
        .post("/api/competencies/roles")
        .set("Cookie", adminCookie)
        .send({ code: randomUUID().toUpperCase(), name: "Operador polivalente" })
        .expect(201);
    const first = await makeRole();
    const second = await makeRole();
    for (const [jobRoleId, minimumLevel] of [
      [first.body.data.id, 1],
      [second.body.data.id, 2],
    ] as const)
      await request(app.getHttpServer())
        .put("/api/competencies/requirements")
        .set("Cookie", adminCookie)
        .send({
          jobRoleId,
          competencyId,
          minimumLevel,
          effectiveFrom: "2026-01-01T00:00:00Z",
          effectiveUntil: null,
          courseId: null,
          learningPathId: null,
        })
        .expect(200);
    await request(app.getHttpServer())
      .put("/api/competencies/assignments")
      .set("Cookie", adminCookie)
      .send({ userId: employeeId, jobRoleId: first.body.data.id, organizationalUnitId: unitId })
      .expect(200);
    const command = {
      id: randomUUID(),
      userId: employeeId,
      jobRoleId: second.body.data.id,
      organizationalUnitId: unitId,
      managerId,
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: null,
      externalHrId: `fictional-HR-${randomUUID()}`,
    };
    const submit = (body: object, cookie = adminCookie) =>
      request(app.getHttpServer())
        .post("/api/competencies/job-assignments")
        .set("Cookie", cookie)
        .send(body);
    await submit(command).expect(201);
    await submit(command).expect(201);
    await submit({ ...command, id: randomUUID() }).expect(409);
    await submit({
      ...command,
      id: randomUUID(),
      externalHrId: null,
      managerId: employeeId,
    }).expect(400);
    await submit({ ...command, id: randomUUID(), externalHrId: null }, managerCookie).expect(403);
    let data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(data.employees).toHaveLength(1);
    expect(data.jobAssignments.filter((x: { state: string }) => x.state === "active")).toHaveLength(
      2,
    );
    expect(
      data.matrix.find((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toMatchObject({
      requiredLevel: 2,
      jobRoleIds: expect.arrayContaining([first.body.data.id, second.body.data.id]),
    });
    await request(app.getHttpServer())
      .post(`/api/competencies/job-assignments/${command.id}/end`)
      .set("Cookie", adminCookie)
      .expect(201);
    data = (await workspace(employeeCookie).expect(200)).body.data;
    expect(data.jobAssignments.find((x: { id: string }) => x.id === command.id)).toMatchObject({
      state: "ended",
      isPrimary: false,
    });
    expect(
      data.matrix.find((x: { competencyId: string }) => x.competencyId === competencyId),
    ).toMatchObject({ requiredLevel: 1 });
    // HR assignment grants scope only to an already authorised assessor, not a new role or permission.
    const outsiderUnit = await createGroupFactory(db)
      .withMembers([outsiderId])
      .create({ name: "Apoio Huíla" });
    const hrAssignment = {
      ...command,
      id: randomUUID(),
      userId: outsiderId,
      organizationalUnitId: outsiderUnit.id,
      externalHrId: null,
    };
    await submit(hrAssignment).expect(201);
    await workspace(managerCookie, outsiderId).expect(200);
    await request(app.getHttpServer())
      .post(`/api/competencies/job-assignments/${hrAssignment.id}/end`)
      .set("Cookie", adminCookie)
      .expect(201);
    await workspace(managerCookie, outsiderId).expect(403);
  });
  it("paginates 500 fictional employees with stable ordering, pre-pagination status filters and scoped history", async () => {
    const [owner] = await db.select().from(users).where(eq(users.id, employeeId));
    const prefix = `Benchmark-${randomUUID()}`;
    const factory = createUserFactory(db);
    const records = Array.from({ length: 500 }, (_, index) => {
      const built = factory.build();
      return {
        id: built.id,
        tenantId: owner.tenantId,
        email: built.email,
        firstName: prefix,
        lastName: `Fictício ${String(Math.floor(index / 5)).padStart(3, "0")}`,
        language: "pt-AO" as const,
      };
    });
    await db.insert(users).values(records);
    const unit = await createGroupFactory(db)
      .withMembers(records.map((x) => x.id))
      .create({ name: "Benchmark 500 — Luanda, Huíla e Benguela (fictício)" });
    await db.insert(groupManagerGroups).values({ managerUserId: managerId, groupId: unit.id });
    const competencyId = await create();
    const role = await request(app.getHttpServer())
      .post("/api/competencies/roles")
      .set("Cookie", adminCookie)
      .send({ code: randomUUID().toUpperCase(), name: "Função de teste 500" })
      .expect(201);
    await request(app.getHttpServer())
      .put("/api/competencies/requirements")
      .set("Cookie", adminCookie)
      .send({
        jobRoleId: role.body.data.id,
        competencyId,
        minimumLevel: 2,
        effectiveFrom: "2026-01-01T00:00:00Z",
        effectiveUntil: null,
        courseId: null,
        learningPathId: null,
      })
      .expect(200);
    await db
      .insert(competencyAssignments)
      .values(
        records.map((x) => ({
          tenantId: owner.tenantId,
          userId: x.id,
          jobRoleId: role.body.data.id,
          organizationalUnitId: unit.id,
          startsAt: "2026-01-01T00:00:00Z",
        })),
      );
    await db
      .insert(competencyAssessments)
      .values(
        records
          .slice(400)
          .map((x) => ({
            tenantId: owner.tenantId,
            userId: x.id,
            competencyId,
            level: 2,
            revision: 1,
            assessorId: adminId,
            rationale: "Avaliação formal fictícia para ensaio de paginação",
            commandHash: `fixture-${x.id}`,
          })),
      );
    const seen = new Set<string>();
    const timings: number[] = [];
    for (let page = 1; page <= 5; page++) {
      const started = performance.now();
      const response = await request(app.getHttpServer())
        .get("/api/competencies/workspace")
        .query({
          keyword: prefix,
          page,
          perPage: 100,
          organizationalUnitId: unit.id,
          jobRoleId: role.body.data.id,
        })
        .set("Cookie", managerCookie)
        .expect(200);
      timings.push(performance.now() - started);
      expect(response.body.data.pagination).toEqual({ total: 500, page, perPage: 100 });
      expect(response.body.data.employees).toHaveLength(100);
      for (const user of response.body.data.employees) {
        expect(seen.has(user.id)).toBe(false);
        seen.add(user.id);
      }
      expect(
        response.body.data.assessments.every((x: { userId: string }) =>
          response.body.data.employees.some((e: { id: string }) => e.id === x.userId),
        ),
      ).toBe(true);
      expect(JSON.stringify(response.body.data)).not.toContain("commandHash");
    }
    expect(seen.size).toBe(500);
    const filtered = await request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query({ keyword: prefix, status: "met", page: 1, perPage: 50 })
      .set("Cookie", managerCookie)
      .expect(200);
    expect(filtered.body.data.pagination.total).toBe(100);
    expect(filtered.body.data.employees).toHaveLength(50);
    expect(filtered.body.data.matrix.every((x: { status: string }) => x.status === "met")).toBe(
      true,
    );
    await request(app.getHttpServer())
      .post("/api/competencies/evidence")
      .set("Cookie", managerCookie)
      .send({
        ...evidence(competencyId, "pending", records[400].id, 2),
        source: "Evidência pendente de revisão — benchmark",
      })
      .expect(201);
    const pending = await request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query({ keyword: prefix, status: "met", pendingEvidenceOnly: true, page: 1, perPage: 50 })
      .set("Cookie", managerCookie)
      .expect(200);
    expect(pending.body.data.pagination.total).toBe(1);
    expect(pending.body.data.employees[0].id).toBe(records[400].id);
    const own = await request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query({ keyword: prefix })
      .set("Cookie", employeeCookie)
      .expect(200);
    expect(own.body.data.pagination.total).toBe(0);
    await request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query({ perPage: 101 })
      .set("Cookie", managerCookie)
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/competencies/workspace")
      .query({ page: 0 })
      .set("Cookie", managerCookie)
      .expect(400);
    const indices = await db.execute(
      sql`SELECT indexname FROM pg_indexes WHERE tablename IN ('competency_assignments','competency_assessments','competency_evidence_reviews')`,
    );
    expect(indices.some((x) => x.indexname === "competency_assignments_employee_idx")).toBe(true);
    expect(indices.some((x) => x.indexname === "competency_assignments_manager_idx")).toBe(true);
    const explain = await db.execute(
      sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM competency_assessments WHERE tenant_id=${owner.tenantId} AND user_id=${records[400].id} AND competency_id=${competencyId} ORDER BY revision DESC LIMIT 1`,
    );
    // eslint-disable-next-line no-console -- Synthetic local benchmark timings; no credentials.
    console.log(
      JSON.stringify({
        benchmark: "Real PostgreSQL + HTTP sequential, not concurrent users",
        employees: 500,
        perPage: 100,
        pageTimesMs: timings,
        minMs: Math.min(...timings),
        maxMs: Math.max(...timings),
        averageMs: timings.reduce((a, b) => a + b, 0) / timings.length,
        assessmentPlan: explain[0]["QUERY PLAN"],
      }),
    );
  }, 120000);
});
