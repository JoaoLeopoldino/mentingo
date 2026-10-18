/** Explicit mock, read-only reconciliation plan. No LMS mutation and no real Primavera access. */
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const {
  SyntheticPrimaveraAdapter,
  SYNTHETIC_PRIMAVERA_EMPLOYEES,
} = require("./src/integration/primavera/synthetic-primavera.adapter.ts");
const {
  readPrimaveraEmployees,
  reconcilePrimaveraEmployees,
} = require("./src/integration/primavera/primavera-reconciliation.ts");
const started = Date.now();
const adapter = new SyntheticPrimaveraAdapter(SYNTHETIC_PRIMAVERA_EMPLOYEES);
const incoming = await readPrimaveraEmployees(adapter);
const current = structuredClone(incoming.slice(0, 2));
current[1].displayName = "Nome anterior fictício";
const result = reconcilePrimaveraEmployees(incoming, current, {
  unitIds: new Set(["LUANDA", "HUILA", "BENGUELA"]),
  jobRoleIds: new Set(["MANAGER", "OPERATOR"]),
});
const report = {
  adapter: adapter.source,
  disclaimer: "MOCK EXPLÍCITO. Não contacta Primavera nem modifica dados do LMS.",
  ...result,
  elapsedMs: Date.now() - started,
};
await writeFile(
  new URL("../../../.local/sprint/primavera-reconciliation.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
