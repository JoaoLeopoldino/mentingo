/** Rehearsal only: creates a fresh isolated database and never overwrites or drops an existing one. */
import { execFileSync } from "node:child_process";
import { openSync, closeSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const container = "utu-omatapalo-sprint-db-1";
const ports = JSON.parse(
  execFileSync("docker", ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container], {
    encoding: "utf8",
  }),
);
if (!ports["5432/tcp"]?.some((p) => p.HostIp === "127.0.0.1" && p.HostPort === "55432"))
  throw new Error("Refusing any container other than the isolated sprint PostgreSQL");
const restoreDb = `guidebook_restore_${randomBytes(5).toString("hex")}`;
const dir = new URL("../../../.local/sprint/", import.meta.url);
mkdirSync(dir, { recursive: true });
const file = new URL(`${restoreDb}.dump`, dir);
const tables = [
  "users",
  "courses",
  "student_courses",
  "certificates",
  "assessment_attempts",
  "scorm_attempts",
  "competency_assessments",
  "competency_plan_history",
];
const fingerprint = (db) =>
  Object.fromEntries(
    tables.map((table) => {
      const sql = `SELECT count(*)::text || ':' || md5(coalesce(json_agg(t ORDER BY t.id)::text, '[]')) FROM ${table} t`;
      const value = execFileSync(
        "docker",
        ["exec", container, "psql", "-U", "postgres", "-d", db, "-Atc", sql],
        { encoding: "utf8" },
      ).trim();
      return [table, value];
    }),
  );
const started = new Date();
const before = fingerprint("guidebook");
let fd = openSync(file, "wx", 0o600);
const backupStart = performance.now();
try {
  execFileSync(
    "docker",
    ["exec", container, "pg_dump", "-U", "postgres", "-d", "guidebook", "-Fc"],
    { stdio: ["ignore", fd, "pipe"] },
  );
} finally {
  closeSync(fd);
}
const backupMs = performance.now() - backupStart;
execFileSync("docker", ["exec", container, "createdb", "-U", "postgres", restoreDb]);
fd = openSync(file, "r");
const restoreStart = performance.now();
try {
  execFileSync(
    "docker",
    ["exec", "-i", container, "pg_restore", "-U", "postgres", "-d", restoreDb, "--exit-on-error"],
    { stdio: [fd, "ignore", "pipe"] },
  );
} finally {
  closeSync(fd);
}
const restoreMs = performance.now() - restoreStart;
const restored = fingerprint(restoreDb);
const sourceAfter = fingerprint("guidebook");
if (JSON.stringify(before) !== JSON.stringify(sourceAfter))
  throw new Error("Source changed during rehearsal; repeat during a quiet interval");
if (JSON.stringify(before) !== JSON.stringify(restored))
  throw new Error("Restore reconciliation failed");
const report = {
  startedAt: started.toISOString(),
  endedAt: new Date().toISOString(),
  source: "guidebook",
  restoreDb,
  backupMs,
  restoreMs,
  tables: restored,
  matched: true,
  limits:
    "Database only, same host/cluster/version; not an object-storage or disaster recovery drill. No production RPO/RTO measured.",
};
writeFileSync(new URL("backup-restore.json", dir), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
