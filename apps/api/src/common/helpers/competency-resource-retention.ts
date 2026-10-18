import { ConflictException } from "@nestjs/common";

/** Keep immutable competency references. Translate only their FK failures, after transaction rollback. */
export function rethrowCompetencyResourceRetention(error: unknown): never {
  let source = error;
  if (typeof source === "object" && source !== null && !("code" in source) && "cause" in source)
    source = source.cause;
  if (
    typeof source === "object" &&
    source !== null &&
    "code" in source &&
    source.code === "23503"
  ) {
    let constraint: unknown;
    if ("constraint_name" in source) constraint = source.constraint_name;
    else if ("constraint" in source) constraint = source.constraint;
    if (
      typeof constraint === "string" &&
      (constraint.startsWith("competency_plan_activities_") ||
        constraint.startsWith("competency_requirement_versions_"))
    )
      throw new ConflictException("competencies.errors.learningResourceInUse");
  }
  throw error;
}
