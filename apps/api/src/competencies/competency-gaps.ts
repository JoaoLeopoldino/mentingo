import type { CompetencyWorkspace } from "./competencies.schema";
import type { CompetencyGapInput } from "./competencies.types";
export function buildCompetencyGaps(
  input: CompetencyGapInput,
  now = Date.now(),
): CompetencyWorkspace["matrix"] {
  const active = new Set(input.catalog.filter((x) => x.active).map((x) => x.id));
  const requirementsByRole = new Map<string, CompetencyGapInput["requirements"]>();
  for (const row of input.requirements) {
    if (
      !active.has(row.competencyId) ||
      Date.parse(row.effectiveFrom) > now ||
      (row.effectiveUntil && Date.parse(row.effectiveUntil) <= now)
    )
      continue;
    const rows = requirementsByRole.get(row.jobRoleId) ?? [];
    rows.push(row);
    requirementsByRole.set(row.jobRoleId, rows);
  }
  const decisions = new Map<string, CompetencyGapInput["orderedEvidence"][number]>();
  const pending = new Set<string>();
  for (const row of input.orderedEvidence) {
    const key = `${row.userId}:${row.competencyId}`;
    if (row.status === "pending") pending.add(key);
    else if (!decisions.has(key)) decisions.set(key, row);
  }
  const result: CompetencyWorkspace["matrix"] = [];
  for (const employee of input.employees)
    for (const requirement of requirementsByRole.get(employee.jobRoleId ?? "") ?? []) {
      const key = `${employee.id}:${requirement.competencyId}`;
      const decision = decisions.get(key);
      let status: CompetencyWorkspace["matrix"][number]["status"] = "missing";
      let currentLevel: number | null = null;
      if (decision) {
        if (decision.status === "rejected") status = "rejected";
        else if (decision.expiresAt && Date.parse(decision.expiresAt) <= now) status = "expired";
        else {
          currentLevel = decision.level;
          status = currentLevel >= requirement.minimumLevel ? "met" : "insufficient";
        }
      } else if (pending.has(key)) status = "pending";
      result.push({
        userId: employee.id,
        competencyId: requirement.competencyId,
        requiredLevel: requirement.minimumLevel,
        currentLevel,
        status,
        courseId: requirement.courseId,
        learningPathId: requirement.learningPathId,
      });
    }
  return result;
}
