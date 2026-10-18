import {
  reconcilePrimaveraEmployees as reconcile,
  readPrimaveraEmployees,
  PrimaveraTransientError,
} from "./primavera-reconciliation";
import {
  SyntheticPrimaveraAdapter,
  SYNTHETIC_PRIMAVERA_EMPLOYEES,
} from "./synthetic-primavera.adapter";
const catalog = {
  unitIds: new Set(["LUANDA", "HUILA", "BENGUELA"]),
  jobRoleIds: new Set(["MANAGER", "OPERATOR"]),
};
const sample = () => structuredClone(SYNTHETIC_PRIMAVERA_EMPLOYEES);
describe("Explicit synthetic Primavera reconciliation", () => {
  it("reads all mock pages, retains leading-zero IDs and plans creates without applying them", async () => {
    const adapter = new SyntheticPrimaveraAdapter(sample(), 1);
    const rows = await readPrimaveraEmployees(adapter);
    const result = reconcile(rows, [], catalog);
    expect(adapter.source).toContain("mock");
    expect(rows[0].externalId).toBe("0001");
    expect(result.actions).toHaveLength(3);
    expect(result).toMatchObject({ applied: false, mode: "dry-run", errors: [] });
  });
  it("is idempotent for an unchanged target and never deactivates omitted employees", () => {
    expect(reconcile(sample(), sample(), catalog).actions).toEqual([]);
    expect(reconcile(sample().slice(0, 1), sample(), catalog).actions).toEqual([]);
  });
  it("plans explicit inactive status without deleting a target or its assignments", () => {
    const current = sample();
    current[2].status = "active";
    const result = reconcile(sample(), current, catalog);
    expect(result.actions).toEqual([
      expect.objectContaining({ kind: "deactivate", externalEmployeeId: "0003" }),
    ]);
    expect(current[2].status).toBe("active");
  });
  it("blocks duplicate IDs, unmapped units and unknown managers without advancing the watermark", () => {
    const rows = sample();
    rows[1].assignments[0].managerEmployeeId = "UNKNOWN";
    rows[1].assignments[0].unitId = "UNKNOWN";
    rows.push(rows[0]);
    const result = reconcile(rows, [], catalog);
    expect(result.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["duplicate_employee_id", "unmapped_unit", "unknown_manager"]),
    );
    expect(result.watermark).toBeNull();
  });
  it("blocks management cycles, invalid dates and stale source records", () => {
    const rows = sample();
    rows[0].assignments[0].managerEmployeeId = "0002";
    rows[2].assignments[0].endsAt = "invalid";
    rows[1].updatedAt = "2020-01-01T00:00:00Z";
    expect(reconcile(rows, sample(), catalog).errors.map((e) => e.code)).toEqual(
      expect.arrayContaining([
        "management_cycle",
        "invalid_assignment_dates",
        "stale_source_record",
      ]),
    );
  });
  it("supports inclusive incremental reads and returns copies instead of mutable mock state", async () => {
    const adapter = new SyntheticPrimaveraAdapter(sample());
    const page = await adapter.fetchEmployees({ changedSince: "2026-10-18T10:00:00Z" });
    expect(page.employees.map((e) => e.externalId)).toEqual(["0003"]);
    page.employees[0].displayName = "Changed";
    expect(
      (await adapter.fetchEmployees({ changedSince: "2026-10-18T10:00:00Z" })).employees[0]
        .displayName,
    ).not.toBe("Changed");
  });
  it("retries transient page failures only and rejects permanent errors and looping cursors", async () => {
    let calls = 0;
    const fetchEmployees = jest.fn(async () => {
      if (++calls === 1) throw new PrimaveraTransientError("temporary");
      return { employees: [], nextCursor: null };
    });
    await expect(
      readPrimaveraEmployees({ source: "synthetic-test", fetchEmployees }),
    ).resolves.toEqual([]);
    expect(calls).toBe(2);
    const permanent = jest.fn(async () => {
      throw new Error("unauthorized");
    });
    await expect(
      readPrimaveraEmployees({ source: "synthetic-test", fetchEmployees: permanent }),
    ).rejects.toThrow("unauthorized");
    expect(permanent).toHaveBeenCalledTimes(1);
    await expect(
      readPrimaveraEmployees({
        source: "synthetic-test",
        fetchEmployees: async () => ({ employees: [], nextCursor: "same" }),
      }),
    ).rejects.toThrow("repeated_cursor");
  });
});
