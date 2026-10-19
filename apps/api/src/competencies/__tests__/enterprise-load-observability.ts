/** Opt-in local load diagnostics. No environment variables, SQL values or secrets are recorded. */
import { execFile, execFileSync } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

import { sql } from "drizzle-orm";

import type { DatabasePg } from "src/common";
const exec = promisify(execFile);
const containers = ["utu-omatapalo-sprint-db-1", "utu-omatapalo-sprint-redis-1"];
export async function startLoadObservation(db: DatabasePg) {
  const started = performance.now();
  const cpuStart = process.cpuUsage();
  const samples: unknown[] = [];
  const errors: string[] = [];
  let running: Promise<void> | undefined;
  const sample = async () => {
    try {
      const activity = await db.execute(sql`
        SELECT state, wait_event_type, wait_event, count(*)::integer AS connections,
          max(extract(epoch from (clock_timestamp()-query_start))*1000)::integer AS oldest_query_ms
        FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
        GROUP BY state, wait_event_type, wait_event`);
      const slow = await db.execute(sql`
        SELECT pid, wait_event_type, wait_event,
          (extract(epoch from (clock_timestamp()-query_start))*1000)::integer AS observed_age_ms,
          left(regexp_replace(regexp_replace(query, '''[^'']*''', '?', 'g'), '[0-9]+', '?', 'g'), 800) AS query_shape
        FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
          AND state='active' AND clock_timestamp()-query_start > interval '100 milliseconds'
        LIMIT 10`);
      samples.push({
        atMs: performance.now() - started,
        rssMiB: process.memoryUsage().rss / 1048576,
        activity,
        slow,
      });
    } catch {
      errors.push("database_observation_failed");
    }
  };
  await sample();
  const timer = setInterval(() => {
    if (!running)
      running = sample().finally(() => {
        running = undefined;
      });
  }, 1000);
  const statistics = async () => {
    const rows = await db.execute(
      sql`SELECT xact_commit,xact_rollback,blks_read,blks_hit,tup_returned,tup_fetched,temp_files,temp_bytes,deadlocks FROM pg_stat_database WHERE datname=current_database()`,
    );
    return rows[0];
  };
  const before = await statistics();
  return async () => {
    clearInterval(timer);
    await running;
    const elapsedMs = performance.now() - started;
    const cpu = process.cpuUsage(cpuStart);
    const after = await statistics();
    const docker = await Promise.all(
      containers.map(async (name) => {
        try {
          const { stdout } = await exec(
            "docker",
            ["stats", "--no-stream", "--format", "{{json .}}", name],
            { timeout: 10000 },
          );
          return JSON.parse(stdout.trim());
        } catch {
          return { Name: name, unavailable: true };
        }
      }),
    );
    let redis: Record<string, string> = {};
    try {
      const { stdout } = await exec("docker", ["exec", containers[1], "redis-cli", "INFO"], {
        timeout: 10000,
      });
      const allowed = new Set([
        "redis_version",
        "connected_clients",
        "used_memory",
        "used_memory_peak",
        "total_commands_processed",
        "instantaneous_ops_per_sec",
        "rejected_connections",
        "evicted_keys",
        "keyspace_hits",
        "keyspace_misses",
      ]);
      redis = Object.fromEntries(
        stdout
          .split(/\r?\n/)
          .filter((line) => allowed.has(line.split(":")[0]))
          .map((line) => line.split(":")),
      );
    } catch {
      errors.push("redis_observation_failed");
    }
    return {
      elapsedMs,
      cpuUserMs: cpu.user / 1000,
      cpuSystemMs: cpu.system / 1000,
      cpuPercentOneCore: ((cpu.user + cpu.system) / 1000 / elapsedMs) * 100,
      samples,
      databaseBefore: before,
      databaseAfter: after,
      dockerEndSnapshot: docker,
      redisEndSnapshot: redis,
      errors,
      limits:
        "PG activity sampled each second; ages are not completed-query durations. Docker/Redis snapshots at profile end, not time-series peaks. pg_stat_database is cumulative and may flush asynchronously. One extra observer connection; app pool max 10.",
    };
  };
}
export async function loadInfrastructure() {
  const docker = await Promise.all(
    containers.map(async (name) => {
      const { stdout } = await exec("docker", ["inspect", "--format", "{{json .}}", name]);
      const value = JSON.parse(stdout);
      return {
        name,
        image: value.Config.Image,
        imageId: value.Image,
        cpuNanoLimit: value.HostConfig.NanoCpus,
        memoryByteLimit: value.HostConfig.Memory,
        ports: value.NetworkSettings.Ports,
      };
    }),
  );
  return {
    gitHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceDirtyPaths: execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter((path) => /^(apps|packages|scripts)\//.test(path)),
    node: process.version,
    platform: os.platform(),
    release: os.release(),
    architecture: os.arch(),
    cpuModel: os.cpus()[0].model,
    logicalCpus: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    docker,
    app: "Nest/Jest same host; application connection pool max 10; real Postgres/RLS and Redis; no production rate limiter",
  };
}
