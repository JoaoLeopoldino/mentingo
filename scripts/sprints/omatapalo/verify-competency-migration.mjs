/** Local synthetic database only. Captures hashes/counts, never records or credentials. */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const postgres = require("postgres");
const target = new URL(process.env.DATABASE_URL);
if (target.hostname !== "127.0.0.1" || target.port !== "55432" || target.pathname !== "/guidebook")
  throw new Error("Refusing unknown database");
const sql = postgres(target.href, { max: 1 });
const file = new URL("../../../.local/sprint/competency-migration-snapshot.json", import.meta.url);
try {
  const [current] =
    await sql`SELECT count(*)::integer AS count, count(*) FILTER (WHERE status='approved')::integer AS approved, md5(COALESCE(string_agg((to_jsonb(e)-'evidence_type')::text, '' ORDER BY e.id),'')) AS hash FROM competency_evidence e`;
  if (process.argv[2] === "capture") {
    writeFileSync(file, JSON.stringify(current, null, 2));
    console.log(JSON.stringify({ phase: "before", ...current }));
  } else if (process.argv[2] === "verify") {
    const previous = JSON.parse(readFileSync(file, "utf8"));
    if (JSON.stringify(current) !== JSON.stringify(previous))
      throw new Error("Original evidence changed");
    const [invalid] =
      await sql`SELECT count(*)::integer AS count FROM competency_evidence e LEFT JOIN competency_assessments a ON a.id=e.id WHERE e.evidence_type='legacy' AND e.status='approved' AND (a.id IS NULL OR a.user_id<>e.user_id OR a.competency_id<>e.competency_id OR a.level<>e.level OR a.created_at<>e.created_at OR a.source_evidence_id<>e.id)`;
    if (invalid.count) throw new Error("Legacy approvals were not preserved");
    const [backfill] =
      await sql`SELECT count(*)::integer AS count FROM competency_assessments a JOIN competency_evidence e ON e.id=a.source_evidence_id WHERE e.evidence_type='legacy'`;
    if (backfill.count !== previous.approved) throw new Error("Unexpected backfill count");
    console.log(
      JSON.stringify({
        phase: "after",
        originalEvidencePreserved: true,
        legacyAssessments: backfill.count,
        ...current,
      }),
    );
  } else throw new Error("Choose capture or verify");
} finally {
  await sql.end();
}
