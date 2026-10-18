import type { CompetencyWorkspace } from "./competencies.schema";
export type CompetencyGapInput = {
  employees: Pick<CompetencyWorkspace["employees"][number], "id" | "jobRoleId">[];
  catalog: Pick<CompetencyWorkspace["catalog"][number], "id" | "active">[];
  requirements: CompetencyWorkspace["requirements"];
  // Repository supplies immutable records in newest-first creation order.
  orderedEvidence: Pick<
    CompetencyWorkspace["evidence"][number],
    "userId" | "competencyId" | "status" | "level" | "expiresAt"
  >[];
};
