/** Inspect installed production dependency metadata without network requests or package execution. */
import { createRequire } from "node:module";
import { readFileSync, existsSync, realpathSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const roots = ["apps/api/package.json", "apps/web/package.json"];
const pending = roots.map((path) => resolve(path));
const seen = new Set(),
  packages = new Map(),
  unresolved = [];
while (pending.length) {
  const path = realpathSync(pending.shift());
  if (seen.has(path)) continue;
  seen.add(path);
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  const id = `${pkg.name}@${pkg.version || "workspace"}`;
  const value = pkg.license ?? pkg.licenses?.map((item) => item.type).join(" OR ") ?? "UNKNOWN";
  const license = typeof value === "string" ? value : JSON.stringify(value);
  packages.set(id, {
    name: pkg.name,
    version: pkg.version ?? null,
    license,
    review: /AGPL|LGPL|GPL|MPL|SSPL|BUSL|UNKNOWN|UNLICENSED|SEE LICENSE/i.test(license),
  });
  const lookup = createRequire(path);
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
    const candidate = (lookup.resolve.paths(`${name}/package.json`) ?? [])
      .map((base) => join(base, name, "package.json"))
      .find(existsSync);
    if (candidate) pending.push(candidate);
    else
      unresolved.push({
        parent: id,
        name,
        optional: Object.hasOwn(pkg.optionalDependencies ?? {}, name),
      });
  }
}
const rows = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
const licenseCounts = Object.fromEntries(
  [...new Set(rows.map((row) => row.license))]
    .sort()
    .map((license) => [license, rows.filter((row) => row.license === license).length]),
);
const report = {
  generatedAt: new Date().toISOString(),
  roots,
  method:
    "Installed package.json production/optional dependency closure, not lockfile verification or legal approval",
  licenseCounts,
  packages: rows,
  unresolved,
};
const output = process.argv[2];
if (!output || !output.startsWith(".local/sprint/"))
  throw new Error("Pass a private .local/sprint/ output path");
writeFileSync(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      count: rows.length,
      licenseCounts,
      review: rows.filter((row) => row.review),
      unresolvedCount: unresolved.length,
      requiredUnresolved: unresolved.filter((row) => !row.optional),
    },
    null,
    2,
  ),
);
