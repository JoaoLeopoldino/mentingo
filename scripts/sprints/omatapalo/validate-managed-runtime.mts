/** Real production-mode API against a fresh restored local database, never the live lab. */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { openSync, closeSync } from "node:fs";
import { mkdir, readFile, writeFile, copyFile, symlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const postgres = require("postgres");
const source = require("dotenv").parse(await readFile(`${root}apps/api/.env`));
const manifest = JSON.parse(await readFile(`${root}.local/sprint/backup-restore.json`, "utf8"));
const fixture = JSON.parse(
  await readFile(`${root}.local/sprint/integrated-demo.json`, "utf8"),
).fixture;
const base = new URL(source.MIGRATOR_DATABASE_URL);
if (
  base.hostname !== "127.0.0.1" ||
  base.port !== "55432" ||
  base.pathname !== "/guidebook" ||
  !/^guidebook_restore_[a-f0-9]{10}$/.test(manifest.restoreDb)
)
  throw new Error("Refusing unknown resources");
base.pathname = `/${manifest.restoreDb}`;
const admin = postgres(base.href, { max: 1 });
const suffix = randomBytes(5).toString("hex"),
  role = `utu_control_${suffix}`,
  password = randomBytes(32).toString("hex");
const runtime = `${root}.local/sprint/managed-runtime-${suffix}`;
await mkdir(runtime, { mode: 0o700 });
await symlink(`${root}apps/api/node_modules`, `${runtime}/node_modules`, "dir");
await symlink(`${root}apps/api/dist`, `${runtime}/dist`, "dir");
await copyFile(`${root}deployment/railway/migrate.mjs`, `${runtime}/release-migrate.mjs`);
await copyFile(
  `${root}deployment/railway/validate-demo-env.mjs`,
  `${runtime}/validate-demo-env.mjs`,
);
const startedAt = new Date().toISOString();
const logPath = `${runtime}/runtime.log`;
const fd = openSync(logPath, "wx", 0o600);
let child: ReturnType<typeof spawn> | undefined;
let control: any, app: any;
const run = (args: string[], env: Record<string, string>) =>
  new Promise<void>((resolve, reject) => {
    const task = spawn(process.execPath, args, {
      cwd: runtime,
      env: { PATH: process.env.PATH, ...env },
      stdio: ["ignore", fd, fd],
    });
    task.once("error", reject);
    task.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Release command failed (${code}); inspect protected log`)),
    );
  });
const fingerprint = async (table: string) => {
  const [row] = await admin.unsafe(
    `SELECT md5(coalesce(jsonb_agg(to_jsonb(t)-'branding_snapshot' ORDER BY id),'[]'::jsonb)::text) AS digest FROM "${table}" t`,
  );
  return row.digest;
};
try {
  const before: Record<string, string> = {};
  for (const table of [
    "certificates",
    "learning_path_certificates",
    "assessment_attempts",
    "scorm_attempts",
  ])
    before[table] = await fingerprint(table);
  await run(["release-migrate.mjs"], { MIGRATOR_DATABASE_URL: base.href });
  for (const table of Object.keys(before))
    assert.equal(await fingerprint(table), before[table], `Migration rewrote ${table} history`);
  // Fresh role only; generated identifiers/password are never printed or committed.
  await admin.unsafe(
    `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS`,
  );
  await admin.unsafe(
    `GRANT CONNECT ON DATABASE "${manifest.restoreDb}" TO "${role}", lms_app_user`,
  );
  await admin.unsafe(`GRANT USAGE ON SCHEMA public TO "${role}", lms_app_user`);
  await admin.unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}", lms_app_user`,
  );
  await admin.unsafe(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${role}", lms_app_user`,
  );
  const controlUrl = new URL(base.href);
  controlUrl.username = role;
  controlUrl.password = password;
  const appUrl = new URL(source.LMS_DATABASE_URL);
  appUrl.pathname = base.pathname;
  await writeFile(
    `${runtime}/roles.env`,
    `CONTROL_DATABASE_URL=${controlUrl.href}\nLMS_DATABASE_URL=${appUrl.href}\n`,
    { mode: 0o600, flag: "wx" },
  );
  control = postgres(controlUrl.href, { max: 1 });
  app = postgres(appUrl.href, { max: 1 });
  const profile = async (db: any) => {
    const [row] =
      await db`SELECT current_user AS name, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, has_schema_privilege(current_user,'public','CREATE') AS schema_create FROM pg_roles WHERE rolname=current_user`;
    return row;
  };
  const controlProfile = await profile(control),
    appProfile = await profile(app);
  for (const record of [controlProfile, appProfile]) {
    assert.equal(record.rolsuper, false);
    assert.equal(record.rolcreatedb, false);
    assert.equal(record.rolcreaterole, false);
    assert.equal(record.schema_create, false);
  }
  assert.equal(controlProfile.rolbypassrls, true);
  assert.equal(appProfile.rolbypassrls, false);
  let ddlDenied = false;
  try {
    await control`CREATE TABLE public.unauthorized_runtime_ddl (id integer)`;
  } catch (error: any) {
    ddlDenied = error.code === "42501";
  }
  assert.equal(ddlDenied, true);
  let migrationSchemaDenied = false;
  try {
    await control`SELECT * FROM drizzle.__drizzle_migrations`;
  } catch (error: any) {
    migrationSchemaDenied = error.code === "42501";
  }
  assert.equal(migrationSchemaDenied, true);
  const [tenant] = await admin`SELECT tenant_id AS id FROM users WHERE id=${fixture.employee.id}`;
  assert.ok(tenant, "Fictional employee tenant must exist in the restored copy");
  const origin = `https://runtime-${suffix}.example.invalid`;
  await admin`UPDATE tenants SET host=${origin} WHERE id=${tenant.id}`;
  const [other] =
    await admin`INSERT INTO tenants(name,host) VALUES('Unidade fictícia externa',${`https://other-${suffix}.example.invalid`}) RETURNING id`;
  await admin`INSERT INTO users(email,first_name,last_name,tenant_id) VALUES(${`runtime-${suffix}@example.com`},'Externo','Fictício',${
    other.id
  })`;
  const visible = await app.begin(async (trx: any) => {
    await trx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
    return trx`SELECT tenant_id FROM users`;
  });
  assert.ok(visible.length > 0);
  assert.ok(visible.every((row: any) => row.tenant_id === tenant.id));
  const env: Record<string, string> = {
    ...source,
    NODE_ENV: "production",
    DEMONSTRATION_MODE: "true",
    RUN_STARTUP_MAINTENANCE: "false",
    CONTROL_DATABASE_URL: controlUrl.href,
    LMS_DATABASE_URL: appUrl.href,
    PORT: "3002",
    API_BIND_HOST: "127.0.0.1",
    CORS_ORIGIN: origin,
    REDIS_URL: "redis://127.0.0.1:56379/4",
    DISABLE_OUTBOX_PROCESSING: "true",
    WORKER_CONCURRENCY: "1",
    EMAIL_ADAPTER: "mailhog",
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH!,
  };
  for (const key of [
    "DATABASE_URL",
    "MIGRATOR_DATABASE_URL",
    "TEST_KEY",
    "DEV_TENANT_ORIGINS",
    "DISABLE_RATE_LIMITING",
    "DATABASE_TEST_URL",
    "REDIS_TEST_URL",
  ])
    delete env[key];
  await run(["validate-demo-env.mjs"], env);
  child = spawn(process.execPath, [`${root}apps/api/dist/src/main.js`], {
    cwd: runtime,
    env: { PATH: process.env.PATH, ...env },
    stdio: ["ignore", fd, fd],
  });
  let healthy = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error("Managed runtime exited; inspect protected log");
    try {
      healthy =
        (
          await fetch("http://127.0.0.1:3002/api/healthcheck", {
            signal: AbortSignal.timeout(1000),
          })
        ).status === 200;
    } catch {}
    if (healthy) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal(healthy, true);
  const client = new FixtureApiClient("http://localhost:3002");
  client.syncTenantOrigin(origin);
  const login = await client.api.authControllerLogin({
    email: fixture.employee.email,
    password: "Password123@",
  });
  assert.equal(login.status, 201);
  const cookies = login.headers["set-cookie"] ?? [];
  assert.ok(cookies.length >= 2);
  assert.ok(
    cookies.every(
      (value: string) =>
        /HttpOnly/i.test(value) && /Secure/i.test(value) && /SameSite=Strict/i.test(value),
    ),
  );
  client.syncCookies(
    cookies.map((header: string) => {
      const pair = header.split(";")[0],
        index = pair.indexOf("=");
      return { name: pair.slice(0, index), value: pair.slice(index + 1) } as any;
    }),
  );
  assert.ok((await client.api.authControllerCurrentUser()).data.data);
  const history = (
    await client.api.certificatesControllerGetLearningHistory({
      userId: fixture.employee.id,
      courseId: fixture.courseId,
    })
  ).data.data;
  const certificate = history.certificates.find((row) => row.status === "active");
  assert.ok(certificate);
  const pdf = await client.api.certificatesControllerDownloadCertificate(
    { certificateId: certificate.id, language: "pt-AO" },
    { format: "arraybuffer" },
  );
  assert.equal(
    Buffer.from(pdf.data as any)
      .subarray(0, 4)
      .toString(),
    "%PDF",
  );
  const workspace = (await client.api.competenciesControllerGetCompetencyWorkspace({})).data.data;
  assert.ok(workspace);
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    restoreDb: manifest.restoreDb,
    controlProfile,
    appProfile,
    ddlDenied,
    migrationSchemaDenied,
    tenantRls: true,
    historyPreserved: true,
    nativeLogin: 201,
    secureCookieAttributes: true,
    certificatePdf: true,
    competencyWorkspace: true,
    ownerCredentialInRuntime: false,
    httpsTransport: false,
    railway: false,
  };
  await writeFile(`${root}.local/sprint/24-managed-runtime.json`, JSON.stringify(report, null, 2), {
    mode: 0o600,
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(
    "Managed runtime validation failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child!.once("exit", resolve));
    child.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
  closeSync(fd);
  await control?.end();
  await app?.end();
  await admin.end();
}
