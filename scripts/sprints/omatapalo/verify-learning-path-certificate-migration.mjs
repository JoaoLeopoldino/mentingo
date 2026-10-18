/** Guard and compare local certificate rows before/after the additive unique index. Never repairs/deletes duplicates. */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({ path: new URL("../../../apps/api/.env", import.meta.url).pathname });
const target = new URL(process.env.MIGRATOR_DATABASE_URL);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55432" ||
  target.pathname !== "/guidebook" ||
  process.env.NODE_ENV !== "development"
)
  throw new Error("Refusing an unknown database");
const db = require("postgres")(target.href, { max: 1 });
const snapshot = new URL(
  "../../../.local/sprint/learning-path-certificate-migration.json",
  import.meta.url,
);
try {
  const [fingerprint] =
    await db`SELECT count(*)::integer AS count, md5(COALESCE(string_agg(to_jsonb(c)::text, '' ORDER BY c.id),'')) AS hash FROM learning_path_certificates c`;
  if (process.argv[2] === "capture") {
    const [duplicates] =
      await db`SELECT count(*)::integer AS count FROM (SELECT tenant_id,user_id,learning_path_id FROM learning_path_certificates WHERE status='active' GROUP BY tenant_id,user_id,learning_path_id HAVING count(*)>1) d`;
    if (duplicates.count)
      throw new Error(
        "Duplicate active credentials require explicit historical review; migration refused",
      );
    writeFileSync(snapshot, JSON.stringify(fingerprint), { flag: "wx" });
    console.log(
      JSON.stringify({ phase: "before", ...fingerprint, duplicateActiveGroups: duplicates.count }),
    );
  } else if (process.argv[2] === "verify") {
    if (JSON.stringify(fingerprint) !== readFileSync(snapshot, "utf8"))
      throw new Error("Certificate rows changed");
    const [index] =
      await db`SELECT i.indisunique AS unique, i.indisvalid AS valid, pg_get_expr(i.indpred,i.indrelid) AS predicate FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='learning_path_certificates_active_recipient_idx'`;
    if (!index?.unique || !index.valid || !index.predicate.includes("active"))
      throw new Error("Expected partial unique index is missing");
    console.log(JSON.stringify({ phase: "after", ...fingerprint, preserved: true, index }));
  } else throw new Error("Use capture or verify");
} finally {
  await db.end();
}
