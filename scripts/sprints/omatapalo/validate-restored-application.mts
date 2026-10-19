/** Boot the real API on restored DB/bucket/Redis2. Never redirect the running demo or change its settings. */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({ path: `${root}apps/api/.env` });
const webRequire = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = webRequire("@playwright/test");
const database = JSON.parse(await readFile(`${root}.local/sprint/backup-restore.json`, "utf8"));
const storage = JSON.parse(
  await readFile(`${root}.local/sprint/storage-backup-restore.json`, "utf8"),
);
const demo = JSON.parse(await readFile(`${root}.local/sprint/integrated-demo.json`, "utf8"));
if (Date.parse(demo.startedAt) > Date.parse(database.startedAt))
  throw new Error(
    "Demo is newer than the database backup; capture fresh storage and database backups first",
  );
if (
  !/^guidebook_restore_[a-f0-9]{10}$/.test(database.restoreDb) ||
  !/^omatapalo-restore-[a-f0-9-]{36}$/.test(storage.target)
)
  throw new Error("Unrecognized restored resources");
const source = new URL(process.env.MIGRATOR_DATABASE_URL!);
if (
  source.hostname !== "127.0.0.1" ||
  source.port !== "55432" ||
  source.pathname !== "/guidebook" ||
  process.env.S3_ENDPOINT !== "http://127.0.0.1:59100"
)
  throw new Error("Refusing an unknown environment");
const databaseUrl = (input: string) => {
  const url = new URL(input);
  url.pathname = `/${database.restoreDb}`;
  return url.href;
};
const db = require("postgres")(databaseUrl(source.href), { max: 1 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const logPath = `${root}.local/sprint/restored-api-${Date.now()}.log`,
  fd = openSync(logPath, "wx", 0o600);
const startedAt = new Date().toISOString(),
  start = Date.now();
const child = spawn(process.execPath, ["dist/src/main.js"], {
  cwd: `${root}apps/api`,
  stdio: ["ignore", fd, fd],
  env: {
    ...process.env,
    PORT: "3001",
    API_BIND_HOST: "127.0.0.1",
    REDIS_URL: "redis://127.0.0.1:56379/2",
    DATABASE_URL: databaseUrl(process.env.DATABASE_URL!),
    MIGRATOR_DATABASE_URL: databaseUrl(source.href),
    LMS_DATABASE_URL: databaseUrl(process.env.LMS_DATABASE_URL!),
    S3_BUCKET_NAME: storage.target,
    AWS_BUCKET_NAME: storage.target,
    DISABLE_OUTBOX_PROCESSING: "true",
  },
});
closeSync(fd);
const exited = new Promise((resolve) => child.once("exit", resolve));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function login(email: string, password: string) {
  const api = new FixtureApiClient("http://localhost:3001");
  api.syncTenantOrigin("http://localhost:5173");
  const response = await api.api.authControllerLogin({ email, password });
  expect(response.status).toBe(201);
  const cookieHeaders = response.headers["set-cookie"] ?? [];
  if (!cookieHeaders.length)
    throw new Error("Restored authentication did not issue session cookies");
  const context = await browser.newContext();
  await context.addCookies(
    cookieHeaders.map((header: string) => {
      const pair = header.split(";")[0],
        separator = pair.indexOf("=");
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        url: "http://localhost:3001",
      };
    }),
  );
  await api.syncFromContext(context, "http://localhost:5173");
  return api;
}

try {
  await expect
    .poll(
      async () => {
        try {
          return (await fetch("http://localhost:3001/api/auth/current-user")).status;
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(401);
  const admin = await login("admin+localhost@example.com", "password");
  expect((await admin.api.authControllerCurrentUser()).data.data).toBeTruthy();
  const [resource] =
    await db`SELECT id, reference FROM resources WHERE content_type='application/pdf' AND visibility='private' AND archived=false LIMIT 1`;
  if (!resource) throw new Error("No retained private PDF to recover");
  const restored = await admin.api.lessonControllerGetLessonResource(resource.id, undefined, {
    format: "arraybuffer",
  });
  const bytes = Buffer.from(restored.data as any);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  const expectedObject = storage.records.find((record: any) => record.key === resource.reference);
  if (!expectedObject) throw new Error("Private PDF missing from backup manifest");
  expect(sha(bytes)).toBe(expectedObject.sha256);
  const original = new FixtureApiClient("http://localhost:3000");
  original.syncTenantOrigin("http://localhost:5173");
  const anonymous = new FixtureApiClient("http://localhost:3001");
  anonymous.syncTenantOrigin("http://localhost:5173");
  const denied = await anonymous.api.lessonControllerGetLessonResource(resource.id, undefined, {
    validateStatus: () => true,
  });
  expect([401, 403, 404]).toContain(denied.status);
  const learner = await login(demo.fixture.employee.email, "Password123@");
  const deniedOther = await learner.api.lessonControllerGetLessonResource(resource.id, undefined, {
    validateStatus: () => true,
  });
  expect([403, 404]).toContain(deniedOther.status);
  const restoredHistory = (
    await learner.api.certificatesControllerGetLearningHistory({
      userId: demo.fixture.employee.id,
      courseId: demo.fixture.courseId,
    })
  ).data.data;
  const activeCertificate = restoredHistory.certificates.find((x) => x.status === "active");
  if (!activeCertificate) throw new Error("No active certificate in the restored learning history");
  if (activeCertificate.id !== demo.fixture.certificateId) {
    const archived = await learner.api.certificatesControllerDownloadCertificate(
      { certificateId: demo.fixture.certificateId, language: "pt-AO" },
      { validateStatus: () => true },
    );
    expect(archived.status).toBe(404);
  }
  const pathDemo = JSON.parse(
    await readFile(`${root}.local/sprint/path-recertification.json`, "utf8"),
  );
  const restoredPath = (
    await learner.api.learningPathCertificateControllerHistory({
      userId: demo.fixture.employee.id,
      learningPathId: pathDemo.pathId,
    })
  ).data.data;
  expect(restoredPath).toEqual(pathDemo.certificates);
  const pdf = await learner.api.certificatesControllerDownloadCertificate(
    { certificateId: activeCertificate.id, language: "pt-AO" },
    { format: "arraybuffer" },
  );
  const certificate = Buffer.from(pdf.data as any);
  expect(certificate.subarray(0, 4).toString()).toBe("%PDF");
  expect(certificate.length).toBeGreaterThan(1000);
  await writeFile(`${root}.local/sprint/22-restored-certificate-final.pdf`, certificate, {
    mode: 0o600,
  });
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - start,
    restoreDb: database.restoreDb,
    restoreBucket: storage.target,
    apiPort: 3001,
    restoredPasswordAuthentication: true,
    pathCredentialsPreserved: restoredPath.length,
    redisDatabase: 2,
    privatePdf: {
      resourceId: resource.id,
      bytes: bytes.length,
      sha256: sha(bytes),
      anonymousStatus: denied.status,
      unrelatedLearnerStatus: deniedOther.status,
    },
    certificate: {
      id: activeCertificate.id,
      bytes: certificate.length,
      sha256: sha(certificate),
    },
    results: [
      "Real API booted against restored database/object bucket, isolated Redis2",
      "Existing synthetic credentials authorized by restored tenant data",
      "Private upload recovered through native API; anonymous/unrelated learner refused",
      "Certificate PDF rendered from restored data/assets",
    ],
    limits:
      "Same Mac/cluster/credentials; no external copy, host loss, real user access, tenant-wide penetration test or production SLA. Source snapshot is not an atomic multi-service backup. Restored API is stopped at the end.",
  };
  await writeFile(
    `${root}.local/sprint/restored-application.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  throw new Error((error as any).response?.data?.message ?? (error as Error).message);
} finally {
  await browser.close();
  await db.end();
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 10000))]);
}
