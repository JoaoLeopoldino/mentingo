import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const pdfParse = createRequire(__filename)("pdf-parse/lib/pdf-parse.js") as (
  bytes: Buffer,
) => Promise<{ text: string }>;
import { eq } from "drizzle-orm";
import request from "supertest";

import { CertificateRepository } from "src/certificates/certificate.repository";
import { CertificatesService } from "src/certificates/certificates.service";
import { captureCertificateBranding } from "src/common/certificates/capture-certificate-branding";
import { LearningPathCertificateService } from "src/learning-path/services/learning-path-certificate.service";
import { S3Service } from "src/s3/s3.service";
import { SettingsService } from "src/settings/settings.service";
import {
  certificates,
  studentCourses,
  learningPathCertificates,
  tenants,
  users,
  learningPaths,
} from "src/storage/schema";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createCourseFactory } from "../../../test/factory/course.factory";
import { createLearningPathFactory } from "../../../test/factory/learningPath.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { cookieFor, truncateAllTables } from "../../../test/helpers/test-helpers";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg } from "src/common";

describe("Immutable certificate branding with actual PostgreSQL/RLS", () => {
  let app: INestApplication, db: DatabasePg, dbAdmin: DatabasePg;
  let tenantId: string;
  let inTenant: <T>(fn: () => Promise<T>) => Promise<T>;
  const previousDemo = process.env.DEMONSTRATION_MODE;
  beforeAll(async () => {
    const context = await createE2ETest({ useDbProxy: true });
    ({ app, db, dbAdmin } = context);
    tenantId = context.defaultTenantId;
    inTenant = (fn) => context.runAsTenant(tenantId, fn);
  });
  beforeEach(async () => {
    await createSettingsFactory(db).create({ userId: null });
  });
  afterEach(async () => {
    if (previousDemo === undefined) delete process.env.DEMONSTRATION_MODE;
    else process.env.DEMONSTRATION_MODE = previousDemo;
    await truncateAllTables(dbAdmin, db);
  });
  afterAll(async () => {
    await app.close();
  });
  async function issuer(name: string) {
    const updated = await inTenant(() =>
      app
        .get(SettingsService)
        .updateCompanyInformation({ companyName: name, certificateIssuer: name }),
    );
    expect(updated.certificateIssuer).toBe(name);
  }
  async function fixture() {
    const user = await createUserFactory(db)
      .withCredentials({ password: "password123" })
      .withUserSettings(db)
      .create();
    const course = await createCourseFactory(db).create({
      authorId: user.id,
      hasCertificate: true,
      thumbnailS3Key: null,
    });
    await db.insert(studentCourses).values({
      studentId: user.id,
      courseId: course.id,
      progress: "completed",
      completedAt: new Date().toISOString(),
    });
    return { user, course };
  }
  it("freezes the original issuer and demo decision, including an idempotent issue after settings change", async () => {
    await issuer("Emissor Fictício A");
    process.env.DEMONSTRATION_MODE = "true";
    const { user, course } = await fixture();
    const service = app.get(CertificatesService);
    const first = await inTenant(() => service.createCertificate(user.id, course.id));
    expect(first.brandingSnapshot).toMatchObject({
      version: 1,
      issuer: "Emissor Fictício A",
      demonstration: true,
      logoKey: null,
    });
    await issuer("Emissor Fictício B");
    process.env.DEMONSTRATION_MODE = "false";
    const duplicate = await inTenant(() => service.createCertificate(user.id, course.id));
    expect(duplicate.id).toBe(first.id);
    expect(duplicate.brandingSnapshot).toEqual(first.brandingSnapshot);
    const render = await inTenant(() =>
      app.get(CertificateRepository).findCertificateByIdForRender(user.id, first.id, "pt-AO"),
    );
    expect(render?.brandingSnapshot?.issuer).toBe("Emissor Fictício A");
    const [stored] = await db.select().from(certificates).where(eq(certificates.id, first.id));
    expect(stored.brandingSnapshot).toEqual(first.brandingSnapshot);
  });
  it("captures the path issuer at native issuance and preserves it on repeated requests", async () => {
    await issuer("Formação Fictícia A");
    const user = await createUserFactory(db)
      .withCredentials({ password: "password123" })
      .withUserSettings(db)
      .create();
    const path = await createLearningPathFactory(db).create({
      authorId: user.id,
      includesCertificate: true,
    });
    const service = app.get(LearningPathCertificateService);
    const first = await inTenant(() => service.createLearningPathCertificate(user.id, path.id));
    expect(first?.brandingSnapshot?.issuer).toBe("Formação Fictícia A");
    await issuer("Formação Fictícia B");
    const duplicate = await inTenant(() => service.createLearningPathCertificate(user.id, path.id));
    expect(duplicate?.id).toBe(first?.id);
    const [stored] = await db
      .select()
      .from(learningPathCertificates)
      .where(eq(learningPathCertificates.id, first!.id));
    expect(stored.brandingSnapshot?.issuer).toBe("Formação Fictícia A");
  });
  it("renders the original issuer and permanent demo notice through the actual authenticated PDF API", async () => {
    const { user, course } = await fixture();
    await issuer("Emissor Original");
    process.env.DEMONSTRATION_MODE = "true";
    const certificate = await inTenant(() =>
      app.get(CertificatesService).createCertificate(user.id, course.id),
    );
    await issuer("Emissor Alterado");
    process.env.DEMONSTRATION_MODE = "false";
    const response = await request(app.getHttpServer())
      .post("/api/certificates/download")
      .set("Cookie", await cookieFor(user, app))
      .send({ certificateId: certificate.id, language: "pt-AO" })
      .expect(201);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    const document = await pdfParse(response.body);
    expect(document.text).toContain("Emissor Original");
    expect(document.text).not.toContain("Emissor Alterado");
    expect(document.text).toContain("DEMONSTRAÇÃO — SEM VALIDADE");
  });
  it.each(["course", "learningPath"] as const)(
    "does not reuse an unmarked legacy cached image for a demo %s credential",
    async (kind) => {
      const { user, course } = await fixture();
      process.env.DEMONSTRATION_MODE = "true";
      let certificateId: string;
      let renderImage: () => Promise<Buffer>;
      let oldPrefix: string;
      if (kind === "course") {
        const service = app.get(CertificatesService);
        const certificate = await inTenant(() => service.createCertificate(user.id, course.id));
        certificateId = certificate.id;
        renderImage = () => inTenant(() => service.getPublicShareImage(certificateId, "pt-AO"));
        oldPrefix = "certificate-share/v2";
      } else {
        const path = await createLearningPathFactory(db).create({
          authorId: user.id,
          includesCertificate: true,
        });
        const service = app.get(LearningPathCertificateService);
        const certificate = await inTenant(() =>
          service.createLearningPathCertificate(user.id, path.id),
        );
        certificateId = certificate!.id;
        renderImage = () => inTenant(() => service.getPublicShareImage(certificateId, "pt-AO"));
        oldPrefix = "learning-path-certificate-share";
      }
      const oldKey = `${tenantId}/${oldPrefix}/${certificateId}/pt-AO.png`;
      const oldBytes = Buffer.from("legacy unmarked fixture, intentionally not a PNG");
      const storage = app.get(S3Service);
      await storage.uploadFile(oldBytes, oldKey, "image/png");
      const image = await renderImage();
      expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(await storage.getFileBuffer(oldKey)).toEqual(oldBytes);
    },
  );
  it("does not fabricate historical issuer metadata for a legacy credential", async () => {
    const { user, course } = await fixture();
    const [legacy] = await db
      .insert(certificates)
      .values({ userId: user.id, courseId: course.id })
      .returning();
    await issuer("Emissor novo");
    const [stored] = await db.select().from(certificates).where(eq(certificates.id, legacy.id));
    expect(stored.brandingSnapshot).toBeNull();
  });
  it("refuses to capture a real source belonging to another tenant", async () => {
    const [foreignTenant] = await dbAdmin
      .insert(tenants)
      .values({ name: "Huíla Fictícia Externa", host: `https://snapshot-${randomUUID()}.invalid` })
      .returning();
    const [owner] = await dbAdmin
      .insert(users)
      .values({
        email: `snapshot-${randomUUID()}@example.com`,
        firstName: "Externo",
        lastName: "Fictício",
        tenantId: foreignTenant.id,
      })
      .returning();
    const [path] = await dbAdmin
      .insert(learningPaths)
      .values({
        authorId: owner.id,
        tenantId: foreignTenant.id,
        title: { en: "External" },
        description: { en: "External" },
      })
      .returning();
    await expect(
      inTenant(() => captureCertificateBranding(db, { kind: "learningPath", id: path.id })),
    ).rejects.toMatchObject({ status: 404 });
  });
});
