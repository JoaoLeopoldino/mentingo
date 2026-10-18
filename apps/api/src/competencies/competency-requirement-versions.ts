import type { CompetencyWorkspace } from "./competencies.schema";
/** A future revision does not replace the current rule prematurely; an expired latest rule does not resurrect older requirements. */
export function resolveCompetencyRequirements(
  history: CompetencyWorkspace["requirementHistory"],
  now = Date.now(),
): CompetencyWorkspace["requirements"] {
  const current = new Map<string, (typeof history)[number]>();
  for (const row of history) {
    if (Date.parse(row.effectiveFrom) > now) continue;
    const previous = current.get(row.requirementId);
    if (!previous || row.version > previous.version) current.set(row.requirementId, row);
  }
  return [...current.values()]
    .filter((row) => !row.effectiveUntil || Date.parse(row.effectiveUntil) > now)
    .map(({ requirementId, ...row }) => ({ ...row, id: requirementId }));
}
