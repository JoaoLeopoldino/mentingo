import type { ReportsResult } from "./schemas/reports.schema";
import type { CertificateLearningHistory } from "src/certificates/certificates.types";
import type { CompetencyWorkspace } from "src/competencies/competencies.schema";
export type AnalyticsScalar = string | number | boolean | null;
export type AnalyticsRow = Record<string, AnalyticsScalar>;
export type AnalyticsInput = {
  rows: ReportsResult["rows"];
  employees: CompetencyWorkspace["employees"];
  matrix: CompetencyWorkspace["matrix"];
  histories: { employeeId: string; courseId: string; history: CertificateLearningHistory }[];
};
export type AnalyticsDataset = Record<
  "employees" | "enrollments" | "completions" | "progress" | "certificates" | "competencies",
  AnalyticsRow[]
>;
