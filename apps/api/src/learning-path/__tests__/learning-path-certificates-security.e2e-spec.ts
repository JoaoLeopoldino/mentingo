import { randomUUID } from "node:crypto";

import { LEARNING_PATH_CERTIFICATE_STATUSES } from "@repo/shared";
import { eq } from "drizzle-orm";
import request from "supertest";

import { LearningPathCertificateService } from "src/learning-path/services/learning-path-certificate.service";
import {
  learningPathCertificates,
  learningPaths,
  learningPathCourses,
  studentCourses,
  tenants,
  users,
} from "src/storage/schema";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createCourseFactory } from "../../../test/factory/course.factory";
import { createLearningPathFactory } from "../../../test/factory/learningPath.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { cookieFor, truncateAllTables } from "../../../test/helpers/test-helpers";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg } from "src/common";

describe("Learning path certificate security with real tenant RLS", () => {
  let app: INestApplication, db: DatabasePg, dbAdmin: DatabasePg;
  let factory: ReturnType<typeof createUserFactory>;
  let inTenant: <T>(fn: () => Promise<T>) => Promise<T>;
  beforeAll(async () => {
    const context = await createE2ETest({ useDbProxy: true });
    app = context.app;
    db = context.db;
    dbAdmin = context.dbAdmin;
    inTenant = (fn) => context.runAsTenant(context.defaultTenantId, fn);
    factory = createUserFactory(db);
  });
  beforeEach(async () => {
    await createSettingsFactory(db).create();
  });
  afterEach(async () => {
    await truncateAllTables(dbAdmin, db);
  });
  afterAll(async () => {
    await app.close();
  });
  async function fixture() {
    const owner = await factory
      .withCredentials({ password: "password123" })
      .withUserSettings(db)
      .create();
    const reader = await factory
      .withCredentials({ password: "password123" })
      .withUserSettings(db)
      .create();
    const admin = await factory
      .withCredentials({ password: "password123" })
      .withAdminSettings(db)
      .create();
    const path = await createLearningPathFactory(db).create({
      authorId: admin.id,
      includesCertificate: true,
    });
    const [certificate] = await db
      .insert(learningPathCertificates)
      .values({ userId: owner.id, learningPathId: path.id })
      .returning();
    return { owner, reader, admin, path, certificate };
  }
  const decision = { reason: "Decisão administrativa fundamentada fictícia" };
  it("revokes with an auditable reason, denies learner management and immediately invalidates the public credential", async () => {
    const { owner, reader, admin, path, certificate } = await fixture();
    const ownCookie = await cookieFor(owner, app),
      adminCookie = await cookieFor(admin, app);
    await request(app.getHttpServer())
      .post(`/api/learning-path/certificates/${certificate.id}/revoke`)
      .set("Cookie", ownCookie)
      .send(decision)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/learning-path/certificates/${certificate.id}/revoke`)
      .set("Cookie", adminCookie)
      .send({ reason: "curto" })
      .expect(400);
    const revoked = await request(app.getHttpServer())
      .post(`/api/learning-path/certificates/${certificate.id}/revoke`)
      .set("Cookie", adminCookie)
      .send(decision)
      .expect(201);
    expect(revoked.body.data).toMatchObject({
      id: certificate.id,
      revokedBy: admin.id,
      revocationReason: decision.reason,
    });
    expect(revoked.body.data.revokedAt).toBeTruthy();
    for (const endpoint of ["share", "share-image"])
      await request(app.getHttpServer())
        .get(`/api/learning-path/certificates/${endpoint}`)
        .query({ certificateId: certificate.id, lang: "pt-AO" })
        .expect(404);
    await request(app.getHttpServer())
      .post("/api/learning-path/certificates/download")
      .set("Cookie", ownCookie)
      .send({ certificateId: certificate.id, language: "pt-AO" })
      .expect(404);
    const current = await request(app.getHttpServer())
      .get("/api/learning-path/certificates/certificate")
      .query({ userId: owner.id, learningPathId: path.id, language: "pt-AO" })
      .set("Cookie", ownCookie)
      .expect(200);
    expect(current.body).toBeNull();
    const history = await request(app.getHttpServer())
      .get("/api/learning-path/certificates/history")
      .set("Cookie", ownCookie)
      .query({ userId: owner.id, learningPathId: path.id })
      .expect(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({
      id: certificate.id,
      issuedAt: certificate.issuedAt,
      revocationReason: decision.reason,
    });
    await request(app.getHttpServer())
      .get("/api/learning-path/certificates/history")
      .set("Cookie", await cookieFor(reader, app))
      .query({ userId: owner.id, learningPathId: path.id })
      .expect(404);
    const repeated = await request(app.getHttpServer())
      .post(`/api/learning-path/certificates/${certificate.id}/revoke`)
      .set("Cookie", adminCookie)
      .send(decision)
      .expect(201);
    expect(repeated.body.data.revokedAt).toBe(revoked.body.data.revokedAt);
  });
  it("requires fresh native course-cycle completions and preserves the previous credential on concurrent recertification", async () => {
    const { owner, admin, path, certificate } = await fixture();
    const course = await createCourseFactory(db).create({ authorId: admin.id });
    await db
      .insert(learningPathCourses)
      .values({ learningPathId: path.id, courseId: course.id, displayOrder: 0 });
    const previousCompletion = "2026-01-01T00:00:00.000Z";
    const snapshot = [{ courseId: course.id, learningCycle: 1, completedAt: previousCompletion }];
    await db
      .update(learningPathCertificates)
      .set({ completionSnapshot: snapshot, issuedAt: "2026-01-02T00:00:00.000Z" })
      .where(eq(learningPathCertificates.id, certificate.id));
    await db.insert(studentCourses).values({
      studentId: owner.id,
      courseId: course.id,
      learningCycle: 1,
      completedAt: previousCompletion,
    });
    const cookie = await cookieFor(admin, app);
    const renew = () =>
      request(app.getHttpServer())
        .post(`/api/learning-path/certificates/${certificate.id}/renew`)
        .set("Cookie", cookie)
        .send(decision);
    await renew().expect(409);
    // Domain/API fixture: represent a newly completed native course cycle. Not a browser retake claim.
    await db
      .update(studentCourses)
      .set({ learningCycle: 2, completedAt: new Date().toISOString() })
      .where(eq(studentCourses.studentId, owner.id));
    const results = await Promise.all(Array.from({ length: 5 }, () => renew().expect(201)));
    expect(new Set(results.map((x) => x.body.data.id)).size).toBe(1);
    const replacement = results[0].body.data;
    expect(replacement).toMatchObject({
      replacesCertificateId: certificate.id,
      renewalReason: decision.reason,
      issuedBy: admin.id,
    });
    expect(replacement.completionSnapshot[0].learningCycle).toBe(2);
    const old = await db.query.learningPathCertificates.findFirst({
      where: eq(learningPathCertificates.id, certificate.id),
    });
    expect(old).toMatchObject({
      completionSnapshot: snapshot,
      status: "expired",
    });
    expect(Date.parse(old!.issuedAt)).toBe(Date.parse("2026-01-02T00:00:00.000Z"));
    await request(app.getHttpServer())
      .get("/api/learning-path/certificates/share")
      .query({ certificateId: replacement.id, lang: "pt-AO" })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/learning-path/certificates/share")
      .query({ certificateId: certificate.id, lang: "pt-AO" })
      .expect(404);
    const history = await request(app.getHttpServer())
      .get("/api/learning-path/certificates/history")
      .set("Cookie", await cookieFor(owner, app))
      .query({ userId: owner.id, learningPathId: path.id })
      .expect(200);
    expect(history.body.data).toHaveLength(2);
    expect(
      (await db.select().from(studentCourses).where(eq(studentCourses.studentId, owner.id)))[0]
        .learningCycle,
    ).toBe(2);
  });
  it("refuses lifecycle decisions across tenants and preserves all records", async () => {
    const { admin, path, certificate } = await fixture();
    const [foreign] = await dbAdmin
      .insert(tenants)
      .values({ name: "Outro tenant fictício", host: `https://lifecycle-${randomUUID()}.invalid` })
      .returning();
    await dbAdmin
      .update(learningPathCertificates)
      .set({ tenantId: foreign.id })
      .where(eq(learningPathCertificates.id, certificate.id));
    for (const action of ["revoke", "renew"])
      await request(app.getHttpServer())
        .post(`/api/learning-path/certificates/${certificate.id}/${action}`)
        .set("Cookie", await cookieFor(admin, app))
        .send(decision)
        .expect(404);
    const stored = await dbAdmin.query.learningPathCertificates.findFirst({
      where: eq(learningPathCertificates.id, certificate.id),
    });
    expect(stored?.revokedAt).toBeNull();
    expect(stored?.status).toBe("active");
    expect(path.id).toBe(certificate.learningPathId);
  });
  it("issues one credential under five concurrent issuance requests", async () => {
    const owner = await factory.withUserSettings(db).create();
    const path = await createLearningPathFactory(db).create({
      authorId: owner.id,
      includesCertificate: true,
    });
    const service = app.get(LearningPathCertificateService);
    const issued = await Promise.all(
      Array.from({ length: 5 }, () =>
        inTenant(() => service.createLearningPathCertificate(owner.id, path.id)),
      ),
    );
    expect(new Set(issued.map((certificate) => certificate.id)).size).toBe(1);
    const stored = await db
      .select()
      .from(learningPathCertificates)
      .where(eq(learningPathCertificates.learningPathId, path.id));
    expect(stored).toHaveLength(1);
  });
  it("enforces one active credential in PostgreSQL while retaining inactive history", async () => {
    const { owner, path } = await fixture();
    await db.insert(learningPathCertificates).values({
      userId: owner.id,
      learningPathId: path.id,
      status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED,
    });
    await expect(
      db.insert(learningPathCertificates).values({ userId: owner.id, learningPathId: path.id }),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("selects the active credential ahead of older inactive history", async () => {
    const owner = await factory.withUserSettings(db).create();
    const path = await createLearningPathFactory(db).create({
      authorId: owner.id,
      includesCertificate: true,
    });
    await db.insert(learningPathCertificates).values({
      userId: owner.id,
      learningPathId: path.id,
      status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED,
      issuedAt: "2026-01-01T00:00:00Z",
    });
    const [active] = await db
      .insert(learningPathCertificates)
      .values({ userId: owner.id, learningPathId: path.id })
      .returning();
    const result = await inTenant(() =>
      app.get(LearningPathCertificateService).createLearningPathCertificate(owner.id, path.id),
    );
    expect(result.id).toBe(active.id);
  });
  it("refuses issuance linking a visible path to another tenant's employee", async () => {
    const { path } = await fixture();
    const [foreignTenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Benguela fictícia externa", host: `https://issue-${randomUUID()}.invalid` })
      .returning();
    const [foreign] = await dbAdmin
      .insert(users)
      .values({
        firstName: "Externo",
        lastName: "Fictício",
        email: `foreign-${randomUUID()}@example.com`,
        tenantId: foreignTenant.id,
      })
      .returning();
    await expect(
      inTenant(() =>
        app.get(LearningPathCertificateService).createLearningPathCertificate(foreign.id, path.id),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await dbAdmin
        .select()
        .from(learningPathCertificates)
        .where(eq(learningPathCertificates.userId, foreign.id)),
    ).toHaveLength(0);
  });
  it("refuses new issuance for a deleted employee", async () => {
    const { reader, path } = await fixture();
    await db
      .update(users)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(users.id, reader.id));
    await expect(
      inTenant(() =>
        app.get(LearningPathCertificateService).createLearningPathCertificate(reader.id, path.id),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await db
        .select()
        .from(learningPathCertificates)
        .where(eq(learningPathCertificates.userId, reader.id)),
    ).toHaveLength(0);
  });
  it("does not silently reactivate an expired credential on repeated issuance", async () => {
    const { owner, path, certificate } = await fixture();
    await db
      .update(learningPathCertificates)
      .set({ status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED })
      .where(eq(learningPathCertificates.id, certificate.id));
    const result = await inTenant(() =>
      app.get(LearningPathCertificateService).createLearningPathCertificate(owner.id, path.id),
    );
    expect(result).toMatchObject({
      id: certificate.id,
      status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED,
    });
    expect(
      await db
        .select()
        .from(learningPathCertificates)
        .where(eq(learningPathCertificates.userId, owner.id)),
    ).toHaveLength(1);
  });
  it("allows the owner and administrator but refuses another learner's metadata", async () => {
    const { owner, reader, admin, path } = await fixture();
    for (const [actor, status] of [
      [owner, 200],
      [reader, 404],
      [admin, 200],
    ] as const) {
      await request(app.getHttpServer())
        .get("/api/learning-path/certificates/certificate")
        .set("Cookie", await cookieFor(actor, app))
        .query({ userId: owner.id, learningPathId: path.id, language: "pt-AO" })
        .expect(status);
    }
  });
  it("refuses another tenant's metadata even to an administrator", async () => {
    const { admin } = await fixture();
    const [foreignTenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Huíla fictícia externa", host: `https://paths-${randomUUID()}.invalid` })
      .returning();
    const [owner] = await dbAdmin
      .insert(users)
      .values({
        email: `path-${randomUUID()}@example.com`,
        firstName: "Colaborador",
        lastName: "Externo",
        tenantId: foreignTenant.id,
      })
      .returning();
    const [path] = await dbAdmin
      .insert(learningPaths)
      .values({
        authorId: owner.id,
        title: { en: "Foreign" },
        description: { en: "Foreign" },
        tenantId: foreignTenant.id,
      })
      .returning();
    await dbAdmin
      .insert(learningPathCertificates)
      .values({ userId: owner.id, learningPathId: path.id, tenantId: foreignTenant.id });
    await request(app.getHttpServer())
      .get("/api/learning-path/certificates/certificate")
      .set("Cookie", await cookieFor(admin, app))
      .query({ userId: owner.id, learningPathId: path.id, language: "pt-AO" })
      .expect(404);
  });
  it.each(["share", "share-image"])(
    "refuses expired dates and inactive statuses immediately through %s",
    async (endpoint) => {
      const { certificate } = await fixture();
      await db
        .update(learningPathCertificates)
        .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
        .where(eq(learningPathCertificates.id, certificate.id));
      await request(app.getHttpServer())
        .get(`/api/learning-path/certificates/${endpoint}`)
        .query({ certificateId: certificate.id, lang: "pt-AO" })
        .expect(404);
      await db
        .update(learningPathCertificates)
        .set({ expiresAt: null, status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED })
        .where(eq(learningPathCertificates.id, certificate.id));
      await request(app.getHttpServer())
        .get(`/api/learning-path/certificates/${endpoint}`)
        .query({ certificateId: certificate.id, lang: "pt-AO" })
        .expect(404);
    },
  );
  it("serves an active public credential without stale caching, then refuses its cached image after expiry", async () => {
    const { owner, certificate } = await fixture();
    const page = await request(app.getHttpServer())
      .get("/api/learning-path/certificates/share")
      .query({ certificateId: certificate.id, lang: "pt-AO" })
      .expect(200);
    expect(page.headers["cache-control"]).toContain("no-store");
    expect(page.text).not.toContain(owner.email);
    const image = await request(app.getHttpServer())
      .get("/api/learning-path/certificates/share-image")
      .query({ certificateId: certificate.id, lang: "pt-AO" })
      .expect(200);
    expect(image.headers["cache-control"]).toContain("no-store");
    expect(image.headers["content-type"]).toContain("image/png");
    await db
      .update(learningPathCertificates)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(learningPathCertificates.id, certificate.id));
    await request(app.getHttpServer())
      .get("/api/learning-path/certificates/share-image")
      .query({ certificateId: certificate.id, lang: "pt-AO" })
      .expect(404);
  });
  it.each(["share", "share-image"])("rejects invalid public input through %s", async (endpoint) => {
    await request(app.getHttpServer())
      .get(`/api/learning-path/certificates/${endpoint}`)
      .query({ certificateId: "invalid" })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/learning-path/certificates/${endpoint}`)
      .query({ certificateId: randomUUID(), lang: "invalid" })
      .expect(400);
  });
  it("refuses share-link creation by another learner", async () => {
    const { reader, certificate } = await fixture();
    await request(app.getHttpServer())
      .post("/api/learning-path/certificates/share-link")
      .set("Cookie", await cookieFor(reader, app))
      .send({ certificateId: certificate.id, language: "pt-AO" })
      .expect(404);
  });
});
