import { PERMISSIONS } from "@repo/shared";

import {
  assertAnalyticsExportAccess,
  buildAnalyticsDataset,
  analyticsCsv,
} from "./analytics-dataset";

import type { AnalyticsInput } from "./analytics-dataset.types";
const fixture = (): AnalyticsInput => ({
  employees: [
    { id: "employee", name: "Colaborador fictício", jobRoleId: null, organizationalUnitId: null },
  ],
  matrix: [],
  rows: [
    {
      id: "row",
      learner: { id: "employee", name: "Colaborador fictício", email: "synthetic@example.com" },
      course: { id: "course", title: "Segurança" },
      path: null,
      status: "completed",
      progress: 100,
      score: 90,
      attempts: 1,
      certificate: { status: "active", issuedAt: "2026-10-18T10:00:00Z" },
      enrolledAt: "2026-10-01T00:00:00Z",
      completedAt: "2026-10-18T10:00:00Z",
      lastActivityAt: null,
      groupIds: [],
      pathCourses: [],
    },
  ],
  histories: [
    {
      employeeId: "employee",
      courseId: "course",
      history: {
        currentLearningCycle: 2,
        assessmentAttempts: [],
        scormAttempts: [],
        certificates: [
          {
            id: "certificate",
            learningCycle: 1,
            status: "archived",
            issuedAt: "2026-01-01T00:00:00Z",
            expiresAt: null,
            archivedAt: "2026-10-01T00:00:00Z",
            archiveReason: "manual_reset",
            revokedBy: null,
            revocationReason: null,
          },
        ],
      },
    },
  ],
});
describe("Power BI manual dataset", () => {
  it("keeps stable enrollment joins and historical certificate cycles without exporting email or free-text reasons", () => {
    const data = buildAnalyticsDataset(fixture());
    expect(data.enrollments).toHaveLength(1);
    expect(data.completions).toHaveLength(1);
    expect(data.certificates[0]).toMatchObject({
      learningCycle: 1,
      archiveReason: "manual_reset",
      enrollmentId: data.enrollments[0].enrollmentId,
    });
    expect(JSON.stringify(data)).not.toContain("synthetic@example.com");
    expect(JSON.stringify(data)).not.toContain("revocationReason");
  });
  it("refuses missing histories, duplicate page rows and certificate mappings outside the visible enrollments", () => {
    const missing = fixture();
    missing.histories = [];
    expect(() => buildAnalyticsDataset(missing)).toThrow("missing_enrollment_history");
    const repeatedEmployee = fixture();
    repeatedEmployee.employees.push(repeatedEmployee.employees[0]);
    expect(() => buildAnalyticsDataset(repeatedEmployee)).toThrow("duplicate_employee");
    const duplicate = fixture();
    duplicate.rows.push(duplicate.rows[0]);
    expect(() => buildAnalyticsDataset(duplicate)).toThrow("duplicate_enrollment");
    const foreign = fixture();
    foreign.histories[0].employeeId = "foreign";
    expect(() => buildAnalyticsDataset(foreign)).toThrow("invalid_certificate_enrollment_mapping");
  });
  it("refuses invalid percentages and duplicate certificates", () => {
    const invalid = fixture();
    invalid.rows[0].progress = 101;
    expect(() => buildAnalyticsDataset(invalid)).toThrow("invalid_progress");
    const duplicate = fixture();
    duplicate.histories[0].history.certificates.push(
      duplicate.histories[0].history.certificates[0],
    );
    expect(() => buildAnalyticsDataset(duplicate)).toThrow("duplicate_certificate");
  });
  it("requires every organisation-wide export permission", () => {
    const permissions = [
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.COMPETENCY_MANAGE,
    ];
    expect(() => assertAnalyticsExportAccess(permissions)).not.toThrow();
    for (const missing of permissions)
      expect(() =>
        assertAnalyticsExportAccess(permissions.filter((permission) => permission !== missing)),
      ).toThrow("analytics_export_requires");
  });
  it("escapes quotes, Unicode and spreadsheet formula strings while preserving numeric values", () => {
    const csv = analyticsCsv(
      [{ name: 'Huíla, "Luanda"', id: "0001", unsafe: " =SUM(1,2)", amount: -2 }],
      ["name", "id", "unsafe", "amount"],
    );
    expect(csv).toContain('"Huíla, ""Luanda"""');
    expect(csv).toContain('"0001"');
    expect(csv).toContain('"\' =SUM(1,2)"');
    expect(csv).toContain('"-2"');
  });
});
