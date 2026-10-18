/** Preserves the original assignment fields when safely widening the local synthetic model. */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({ path: new URL("../../../apps/api/.env", import.meta.url).pathname });
const target = new URL(process.env.MIGRATOR_DATABASE_URL);
if (target.hostname !== "127.0.0.1" || target.port !== "55432" || target.pathname !== "/guidebook" || process.env.NODE_ENV !== "development") throw new Error("Refusing an unknown database");
const db = require("postgres")(target.href, { max: 1 });
const file = new URL("../../../.local/sprint/competency-job-migration-snapshot.json", import.meta.url);
try {
 const [current] = await db`SELECT count(*)::integer AS count, md5(COALESCE(string_agg((to_jsonb(a)-ARRAY['is_primary','state','manager_id','starts_at','ends_at','external_hr_id','command_hash'])::text, '' ORDER BY a.id),'')) AS hash FROM competency_assignments a`;
 if (process.argv[2] === "capture") { writeFileSync(file, JSON.stringify(current)); console.log(JSON.stringify({ phase: "before", ...current })); }
 else if (process.argv[2] === "verify") {
   if (JSON.stringify(current) !== readFileSync(file, "utf8")) throw new Error("Original assignments changed");
   const [legacy] = await db`SELECT count(*)::integer AS count FROM competency_assignments WHERE is_primary=true AND state='active' AND starts_at IS NULL AND ends_at IS NULL AND manager_id IS NULL AND external_hr_id IS NULL`;
   if (legacy.count !== current.count) throw new Error("Legacy primary semantics changed");
   console.log(JSON.stringify({ phase: "after", originalAssignmentsPreserved: true, ...current }));
 } else throw new Error("Use capture or verify");
} finally { await db.end(); }
