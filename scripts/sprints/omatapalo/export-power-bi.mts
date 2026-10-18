/** Manual local-only export of real, authorized LMS data. No connection to the Power BI service. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import type { AnalyticsInput } from "../../../apps/api/src/report/analytics-dataset.types";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const apiRequire = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const { assertAnalyticsExportAccess, buildAnalyticsDataset, analyticsCsv } = apiRequire(
  "./src/report/analytics-dataset.ts",
);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const api = new FixtureApiClient("http://localhost:3000");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
const startedAt = new Date().toISOString();
const pageSize = Number(process.env.SPRINT_EXPORT_PAGE_SIZE ?? 100);
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
  throw new Error("invalid_page_size");
try {
  const page = await context.newPage();
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, "http://localhost:5173");
  const actor = (await api.api.authControllerCurrentUser()).data.data;
  assertAnalyticsExportAccess(actor.permissions);
  const input: AnalyticsInput = { rows: [], employees: [], matrix: [], histories: [] };
  const options = (await api.api.reportControllerGetReportOptions({ language: "pt-AO" })).data.data;
  for (const course of options.courses) {
    let expectedTotal: number | undefined;
    let received = 0;
    for (let page = 1; ; page++) {
      const result = (
        await api.api.reportControllerRunReport({
          view: "course",
          subjectId: course.id,
          timezone: "Africa/Luanda",
          groupIds: [],
          language: "pt-AO",
          page,
          pageSize,
        })
      ).data.data;
      if (expectedTotal !== undefined && expectedTotal !== result.total)
        throw new Error("report_changed_during_export");
      expectedTotal = result.total;
      input.rows.push(...result.rows);
      received += result.rows.length;
      if (received >= result.total) break;
      if (!result.rows.length || page >= 1000) throw new Error("invalid_report_pagination");
    }
    if (received !== expectedTotal) throw new Error("report_count_mismatch");
  }
  let expectedEmployees: number | undefined;
  for (let page = 1; ; page++) {
    const workspace = (
      await api.api.competenciesControllerGetCompetencyWorkspace({
        language: "pt-AO",
        page,
        perPage: pageSize,
      })
    ).data.data;
    if (expectedEmployees !== undefined && expectedEmployees !== workspace.pagination.total)
      throw new Error("employees_changed_during_export");
    expectedEmployees = workspace.pagination.total;
    input.employees.push(...workspace.employees);
    input.matrix.push(...workspace.matrix);
    if (input.employees.length >= expectedEmployees) break;
    if (!workspace.employees.length || page >= 1000) throw new Error("invalid_employee_pagination");
  }
  for (const row of input.rows) {
    if (!row.course) throw new Error("course_report_returned_aggregate_row");
    const history = (
      await api.api.certificatesControllerGetLearningHistory({
        userId: row.learner.id,
        courseId: row.course.id,
      })
    ).data.data;
    input.histories.push({ employeeId: row.learner.id, courseId: row.course.id, history });
  }
  const datasets = buildAnalyticsDataset(input);
  const folder = `${root}.local/sprint/power-bi-${Date.now()}`;
  await mkdir(folder, { recursive: false });
  const columns = {
    employees: ["employeeId", "name"],
    enrollments: ["enrollmentId", "employeeId", "courseId", "status", "enrolledAt"],
    completions: ["enrollmentId", "employeeId", "courseId", "completedAt", "scorePercentage"],
    progress: ["enrollmentId", "employeeId", "courseId", "progressPercentage", "lastActivityAt"],
    certificates: [
      "certificateId",
      "enrollmentId",
      "employeeId",
      "courseId",
      "learningCycle",
      "storedStatus",
      "archiveReason",
      "issuedAt",
      "expiresAt",
    ],
    competencies: [
      "employeeId",
      "competencyId",
      "requiredLevel",
      "demonstratedLevel",
      "status",
      "mandatory",
      "assessmentId",
      "recommendedCourseId",
      "recommendedLearningPathId",
    ],
  };
  for (const name of Object.keys(columns) as (keyof typeof datasets)[])
    await writeFile(`${folder}/${name}.csv`, analyticsCsv(datasets[name], columns[name]));
  const manifest = {
    schemaVersion: 1,
    pageSize,
    numericCulture: "en-US",
    idType: "text",
    source: "real local LMS APIs with fictional data",
    startedAt,
    endedAt: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(datasets).map(([key, rows]) => [key, rows.length])),
    authorization:
      "Authenticated synthetic administrator; report, user-management and competency-management permissions; each API independently checks tenant/scope",
    limits:
      "Manual, non-atomic multi-request extraction; no real Power BI connection, incremental CDC, gateway, service principal or scheduled refresh. Export during a quiet interval. IDs must be imported as text. Certificate storedStatus must be combined with expiry and archiveReason; revoked certificates never become active by date alone.",
  };
  await writeFile(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2));
  await writeFile(
    `${root}.local/sprint/power-bi-export.json`,
    JSON.stringify({ folder, ...manifest }, null, 2),
  );
  console.log(JSON.stringify({ folder, ...manifest }));
} catch (error) {
  throw new Error(error instanceof Error ? error.message : String(error));
} finally {
  await context.close();
  await browser.close();
}
