import type { CompetencyWorkspace } from "./competencies.schema";
export type CompetencyGapInput = {
  employees: Pick<CompetencyWorkspace["employees"][number], "id" | "jobRoleId">[];
  jobAssignments?: CompetencyWorkspace["jobAssignments"];
  catalog: Pick<CompetencyWorkspace["catalog"][number], "id" | "active">[];
  requirements: CompetencyWorkspace["requirements"];
  orderedAssessments: Pick<
    CompetencyWorkspace["assessments"][number],
    "id" | "userId" | "competencyId" | "level" | "expiresAt"
  >[];
  revocations: Pick<
    CompetencyWorkspace["revocations"][number],
    "assessmentId" | "kind" | "effectiveAt" | "endsAt"
  >[];
  // Repository supplies immutable records in newest-first creation order.
  orderedEvidence: Pick<
    CompetencyWorkspace["evidence"][number],
    "userId" | "competencyId" | "status" | "level" | "expiresAt"
  >[];
};

export type CompetencyWorkspaceFilters = {
  page?: number;
  perPage?: number;
  keyword?: string;
  pendingEvidenceOnly?: boolean;
  organizationalUnitId?: string;
  jobRoleId?: string;
  status?: CompetencyWorkspace["matrix"][number]["status"];
};
