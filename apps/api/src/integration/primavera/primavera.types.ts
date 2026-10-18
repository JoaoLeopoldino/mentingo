/** Transport-neutral contract. A real Primavera version/API module must be discovered separately. */
export type PrimaveraJobAssignment = {
  externalId: string;
  unitId: string;
  jobRoleId: string;
  managerEmployeeId: string | null;
  startsAt: string;
  endsAt: string | null;
};
export type PrimaveraEmployee = {
  externalId: string;
  displayName: string;
  status: "active" | "inactive";
  updatedAt: string;
  assignments: PrimaveraJobAssignment[];
};
export type PrimaveraEmployeePage = { employees: PrimaveraEmployee[]; nextCursor: string | null };
export interface PrimaveraAdapter {
  readonly source: string;
  fetchEmployees(options: {
    cursor?: string;
    changedSince?: string;
  }): Promise<PrimaveraEmployeePage>;
}
export type PrimaveraReconciliation = {
  mode: "dry-run";
  applied: false;
  actions: {
    kind: "create" | "update" | "deactivate";
    externalEmployeeId: string;
    proposed: PrimaveraEmployee;
  }[];
  unchanged: string[];
  errors: { externalEmployeeId: string; code: string }[];
  watermark: string | null;
};
