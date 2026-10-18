import type {
  PrimaveraAdapter,
  PrimaveraEmployee,
  PrimaveraReconciliation,
} from "./primavera.types";

/** Reconciles a complete fetched batch against an explicitly mapped HR snapshot. Never mutates LMS records. */
export function reconcilePrimaveraEmployees(
  incoming: PrimaveraEmployee[],
  current: PrimaveraEmployee[],
  catalog: { unitIds: ReadonlySet<string>; jobRoleIds: ReadonlySet<string> },
): PrimaveraReconciliation {
  const result: PrimaveraReconciliation = {
    mode: "dry-run",
    applied: false,
    actions: [],
    unchanged: [],
    errors: [],
    watermark: null,
  };
  const counts = new Map<string, number>();
  for (const employee of incoming)
    counts.set(employee.externalId, (counts.get(employee.externalId) ?? 0) + 1);
  if (new Set(current.map((e) => e.externalId)).size !== current.length)
    throw new Error("ambiguous_target_employee_mapping");
  const old = new Map(current.map((e) => [e.externalId, e]));
  const known = new Map([...current, ...incoming].map((e) => [e.externalId, e]));
  const validDate = (value: string) => value.endsWith("Z") && Number.isFinite(Date.parse(value));
  const canonical = (employee: PrimaveraEmployee) =>
    JSON.stringify({
      ...employee,
      assignments: [...employee.assignments].sort((a, b) =>
        a.externalId.localeCompare(b.externalId),
      ),
    });
  for (const employee of incoming) {
    const codes = new Set<string>();
    if (!employee.externalId.trim() || employee.externalId !== employee.externalId.trim())
      codes.add("invalid_employee_id");
    if (counts.get(employee.externalId)! > 1) codes.add("duplicate_employee_id");
    if (!employee.displayName.trim()) codes.add("missing_name");
    if (!["active", "inactive"].includes(employee.status)) codes.add("invalid_status");
    if (!validDate(employee.updatedAt)) codes.add("invalid_updated_at");
    if (new Set(employee.assignments.map((a) => a.externalId)).size !== employee.assignments.length)
      codes.add("duplicate_assignment_id");
    for (const assignment of employee.assignments) {
      if (!assignment.externalId.trim()) codes.add("invalid_assignment_id");
      if (!catalog.unitIds.has(assignment.unitId)) codes.add("unmapped_unit");
      if (!catalog.jobRoleIds.has(assignment.jobRoleId)) codes.add("unmapped_job_role");
      if (
        !validDate(assignment.startsAt) ||
        (assignment.endsAt !== null &&
          (!validDate(assignment.endsAt) ||
            Date.parse(assignment.endsAt) <= Date.parse(assignment.startsAt)))
      )
        codes.add("invalid_assignment_dates");
      if (assignment.managerEmployeeId && !known.has(assignment.managerEmployeeId))
        codes.add("unknown_manager");
    }
    const queue = employee.assignments
      .map((a) => a.managerEmployeeId)
      .filter((id): id is string => Boolean(id));
    const visited = new Set<string>();
    while (queue.length) {
      const id = queue.pop()!;
      if (id === employee.externalId) {
        codes.add("management_cycle");
        break;
      }
      if (visited.has(id)) continue;
      visited.add(id);
      for (const a of known.get(id)?.assignments ?? [])
        if (a.managerEmployeeId) queue.push(a.managerEmployeeId);
    }
    const previous = old.get(employee.externalId);
    if (previous && Date.parse(employee.updatedAt) < Date.parse(previous.updatedAt))
      codes.add("stale_source_record");
    if (codes.size) {
      result.errors.push(
        ...[...codes].map((code) => ({ externalEmployeeId: employee.externalId, code })),
      );
      continue;
    }
    if (previous && canonical(previous) === canonical(employee))
      result.unchanged.push(employee.externalId);
    else {
      let kind: "create" | "update" | "deactivate" = previous ? "update" : "create";
      if (previous && employee.status === "inactive") kind = "deactivate";
      result.actions.push({ kind, externalEmployeeId: employee.externalId, proposed: employee });
    }
  }
  // Never advance a source watermark past rejected records or infer deletion from absence.
  if (!result.errors.length && incoming.length)
    result.watermark = [...incoming]
      .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .at(-1)!.updatedAt;
  return result;
}

/** Bounded transport retries. A future persisted import must run in the existing BullMQ/outbox infrastructure. */
export async function readPrimaveraEmployees(
  adapter: PrimaveraAdapter,
  changedSince?: string,
): Promise<PrimaveraEmployee[]> {
  const employees: PrimaveraEmployee[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    let page;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        page = await adapter.fetchEmployees({ cursor, changedSince });
        break;
      } catch (error) {
        if (!(error instanceof PrimaveraTransientError) || attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
      }
    }
    if (!page) throw new Error("missing_page");
    employees.push(...page.employees);
    if (employees.length > 10000) throw new Error("synthetic_batch_limit");
    if (page.nextCursor && seen.has(page.nextCursor)) throw new Error("repeated_cursor");
    if (page.nextCursor) seen.add(page.nextCursor);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return employees;
}
export class PrimaveraTransientError extends Error {}
