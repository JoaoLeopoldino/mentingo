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
  const decisions = new Map<string, CompetencyGapInput["orderedAssessments"][number]>();
  for (const row of input.orderedAssessments) {
    const key = `${row.userId}:${row.competencyId}`;
    if (!decisions.has(key)) decisions.set(key, row);
  }
  const restrictions = new Map<string, "revoked" | "suspended">();
  for (const row of input.revocations) {
    if (Date.parse(row.effectiveAt) > now || (row.endsAt && Date.parse(row.endsAt) <= now))
      continue;
    if (restrictions.get(row.assessmentId) !== "revoked")
      restrictions.set(row.assessmentId, row.kind);
  }
  const pending = new Set<string>();
  const rejected = new Set<string>();
  for (const row of input.orderedEvidence) {
    const key = `${row.userId}:${row.competencyId}`;
    if (row.status === "pending") pending.add(key);
    else if (row.status === "rejected") rejected.add(key);
  }
  const result: CompetencyWorkspace["matrix"] = [];
  const rolesByUser = new Map<string, Set<string>>();
  for (const assignment of input.jobAssignments ?? []) {
    if (
      assignment.state !== "active" ||
      (assignment.startsAt && Date.parse(assignment.startsAt) > now) ||
      (assignment.endsAt && Date.parse(assignment.endsAt) <= now)
    )
      continue;
    const roles = rolesByUser.get(assignment.userId) ?? new Set<string>();
    roles.add(assignment.jobRoleId);
    rolesByUser.set(assignment.userId, roles);
  }
  for (const employee of input.employees) {
    const roles =
      input.jobAssignments === undefined
        ? [employee.jobRoleId ?? ""]
        : [...(rolesByUser.get(employee.id) ?? [])];
    const required = new Map<
      string,
      { requirement: CompetencyGapInput["requirements"][number]; jobRoleIds: string[] }
    >();
    for (const roleId of roles)
      for (const row of requirementsByRole.get(roleId) ?? []) {
        const previous = required.get(row.competencyId);
        if (!previous) required.set(row.competencyId, { requirement: row, jobRoleIds: [roleId] });
        else {
          previous.jobRoleIds.push(roleId);
          // Optional higher targets never raise a mandatory minimum from another active role.
          if (
            (row.mandatory && !previous.requirement.mandatory) ||
            (row.mandatory === previous.requirement.mandatory &&
              row.minimumLevel > previous.requirement.minimumLevel)
          )
            previous.requirement = row;
        }
      }
    for (const { requirement, jobRoleIds } of required.values()) {
      const key = `${employee.id}:${requirement.competencyId}`;
      const decision = decisions.get(key);
      let status: CompetencyWorkspace["matrix"][number]["status"] = "missing";
      let currentLevel: number | null = null;
      if (decision) {
        const restriction = restrictions.get(decision.id);
        if (restriction) status = restriction;
        else if (decision.expiresAt && Date.parse(decision.expiresAt) <= now) status = "expired";
        else {
          currentLevel = decision.level;
          status = currentLevel >= requirement.minimumLevel ? "met" : "insufficient";
        }
      } else if (pending.has(key)) status = "pending";
      else if (rejected.has(key)) status = "evidence_rejected";
      result.push({
        userId: employee.id,
        competencyId: requirement.competencyId,
        requiredLevel: requirement.minimumLevel,
        mandatory: requirement.mandatory,
        jobRoleIds,
        assessmentId: decision?.id ?? null,
        currentLevel,
        status,
        courseId: requirement.courseId,
        learningPathId: requirement.learningPathId,
      });
    }
  }
  return result;
}
