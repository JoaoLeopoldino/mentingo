/** Local sprint only: back up before additive migrations and reconcile historical records. */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const source = require("dotenv").parse(await readFile(`${root}apps/api/.env`));
const target = new URL(source.MIGRATOR_DATABASE_URL);
if (target.hostname !== "127.0.0.1" || target.port !== "55432" || target.pathname !== "/guidebook")
  throw new Error("Refusing an unknown database");
const container = "utu-omatapalo-sprint-db-1";
const ports = JSON.parse(
  execFileSync("docker", ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container], {
    encoding: "utf8",
  }),
);
if (!ports["5432/tcp"]?.some((p) => p.HostIp === "127.0.0.1" && p.HostPort === "55432"))
  throw new Error("Refusing an unknown PostgreSQL container");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");
const db = postgres(target.href, { max: 1 });
const startedAt = new Date().toISOString();
const backupPath = `${root}.local/sprint/pre-release-${Date.now()}.dump`;
const tables = [
  "certificates",
  "learning_path_certificates",
  "assessment_attempts",
  "scorm_attempts",
];
const fingerprints = async () =>
  Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => {
        const [row] = await db.unsafe(
          `SELECT md5(coalesce(jsonb_agg(to_jsonb(t)-'branding_snapshot' ORDER BY id),'[]'::jsonb)::text) AS digest FROM "${table}" t`,
        );
        return [table, row.digest];
      }),
    ),
  );
try {
  const before = await fingerprints();
  const fd = openSync(backupPath, "wx", 0o600);
  try {
    execFileSync(
      "docker",
      ["exec", container, "pg_dump", "-U", "postgres", "-d", "guidebook", "-Fc"],
      { stdio: ["ignore", fd, "pipe"] },
    );
  } finally {
    closeSync(fd);
  }
  await db`SELECT pg_advisory_lock(1600237)`;
  await migrate(drizzle(db), { migrationsFolder: `${root}apps/api/dist/src/storage/migrations` });
  assert.deepEqual(await fingerprints(), before, "Historical records changed during migration");
  const columns =
    await db`SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='branding_snapshot' AND table_name IN ('certificates','learning_path_certificates')`;
  assert.equal(columns.length, 2);
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    database: "guidebook",
    backupPath,
    historyPreserved: true,
    snapshotColumns: 2,
  };
  await writeFile(`${root}.local/sprint/24-local-migration.json`, JSON.stringify(report, null, 2), {
    mode: 0o600,
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await db.end();
}
