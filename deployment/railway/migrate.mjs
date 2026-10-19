// Executed in the API release image by a dedicated, non-public migration service.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
const url = process.env.MIGRATOR_DATABASE_URL;
if (!url)
  throw new Error("MIGRATOR_DATABASE_URL is required; runtime credentials are not a fallback");
const sql = postgres(url, { max: 1 });
try {
  // Serializes releases; lock is session-bound on this single connection.
  await sql`select pg_advisory_lock(1600237)`;
  await migrate(drizzle(sql), { migrationsFolder: "./dist/src/storage/migrations" });
  console.log("Release migrations completed; no demo seed executed");
} finally {
  await sql.end();
}
