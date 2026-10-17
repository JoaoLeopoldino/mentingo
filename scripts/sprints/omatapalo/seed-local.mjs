// Run once against the dedicated sprint database. Refuses populated user tables.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({ path: `${root}apps/api/.env` });
const postgres = require("postgres");
const connection = process.env.MIGRATOR_DATABASE_URL;
const target = new URL(connection);
if (target.hostname !== "127.0.0.1" || target.port !== "55432" || target.pathname !== "/guidebook" || process.env.NODE_ENV !== "development") {
  throw new Error("Refusing to seed a database outside the isolated sprint target");
}
const db = postgres(connection, { onnotice: () => {} });
try {
  const [{ count }] = await db`select count(*)::int as count from users`;
  if (count !== 0) throw new Error("Database already contains users; preserve it and do not reseed");
  const seed = spawnSync("corepack", ["pnpm", "--filter", "api", "db:seed"], { cwd: root, stdio: "inherit" });
  if (seed.status !== 0) throw new Error("Synthetic seed failed");
  const password = target.password;
  if (!/^[a-f0-9]{48}$/.test(password)) throw new Error("Unexpected sprint password format");
  await db.unsafe(`ALTER ROLE lms_app_user WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${password}'`);
  const [{ count: created }] = await db`select count(*)::int as count from users`;
  if (!created) throw new Error("Seed returned without creating users; inspect local seed output");
  console.log(`Synthetic seed validated: ${created} users. Application role remains subject to RLS.`);
} finally {
  await db.end();
}
