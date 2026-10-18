import { PERMISSIONS, hasAllPermissions } from "@repo/shared";

import type {
  AnalyticsDataset,
  AnalyticsInput,
  AnalyticsRow,
  AnalyticsScalar,
} from "./analytics-dataset.types";
import type { PermissionKey } from "@repo/shared";

/** Manual organisation-wide export has stricter access than an individual dashboard. API calls still enforce their own scopes. */
export function assertAnalyticsExportAccess(permissions: PermissionKey[]): void {
  if (
    !hasAllPermissions(permissions, [
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.COMPETENCY_MANAGE,
    ])
  )
    throw new Error(
      "analytics_export_requires_organisation_report_user_and_competency_permissions",
    );
}
export function buildAnalyticsDataset(input: AnalyticsInput): AnalyticsDataset {
  const data: AnalyticsDataset = {
    employees: [],
    enrollments: [],
    completions: [],
    progress: [],
    certificates: [],
    competencies: [],
  };
  const employees = new Map(input.employees.map((employee) => [employee.id, employee.name]));
  if (employees.size !== input.employees.length) throw new Error("duplicate_employee");
  const enrollments = new Set<string>();
  for (const row of input.rows) {
    if (!row.course) throw new Error("analytics_requires_course_rows");
    const key = `${row.learner.id}|${row.course.id}`;
    if (enrollments.has(key)) throw new Error("duplicate_enrollment");
    enrollments.add(key);
    employees.set(row.learner.id, row.learner.name);
    if (
      row.progress !== null &&
      (!Number.isFinite(row.progress) || row.progress < 0 || row.progress > 100)
    )
      throw new Error("invalid_progress");
    const identity = { enrollmentId: key, employeeId: row.learner.id, courseId: row.course.id };
    data.enrollments.push({ ...identity, status: row.status, enrolledAt: row.enrolledAt });
    data.progress.push({
      ...identity,
      progressPercentage: row.progress,
      lastActivityAt: row.lastActivityAt,
    });
    if (row.completedAt)
      data.completions.push({
        ...identity,
        completedAt: row.completedAt,
        scorePercentage: row.score,
      });
  }
  const certificates = new Set<string>();
  const histories = new Set<string>();
  for (const entry of input.histories) {
    const key = `${entry.employeeId}|${entry.courseId}`;
    if (!enrollments.has(key) || histories.has(key))
      throw new Error("invalid_certificate_enrollment_mapping");
    histories.add(key);
    for (const certificate of entry.history.certificates) {
      if (certificates.has(certificate.id)) throw new Error("duplicate_certificate");
      certificates.add(certificate.id);
      data.certificates.push({
        certificateId: certificate.id,
        enrollmentId: key,
        employeeId: entry.employeeId,
        courseId: entry.courseId,
        learningCycle: certificate.learningCycle,
        storedStatus: certificate.status,
        archiveReason: certificate.archiveReason,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
      });
    }
  }
  if (histories.size !== enrollments.size) throw new Error("missing_enrollment_history");
  const gaps = new Set<string>();
  for (const row of input.matrix) {
    const key = `${row.userId}|${row.competencyId}`;
    if (gaps.has(key) || !employees.has(row.userId)) throw new Error("invalid_competency_mapping");
    gaps.add(key);
    data.competencies.push({
      employeeId: row.userId,
      competencyId: row.competencyId,
      requiredLevel: row.requiredLevel,
      demonstratedLevel: row.currentLevel,
      status: row.status,
      mandatory: row.mandatory,
      assessmentId: row.assessmentId,
      recommendedCourseId: row.courseId,
      recommendedLearningPathId: row.learningPathId,
    });
  }
  data.employees = [...employees].map(([employeeId, name]) => ({ employeeId, name }));
  return data;
}
/** Quote CSV consistently and prevent spreadsheet formula execution in string columns. */
export function analyticsCsv(rows: AnalyticsRow[], columns: string[]): string {
  const cell = (value: AnalyticsScalar | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (typeof value === "string" && /^\s*[=+\-@]/.test(value)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    [
      columns.map(cell).join(","),
      ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
