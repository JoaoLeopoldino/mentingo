/** Real Chrome / local API / private storage. Upstream synthetic MIT fixture, not independent-vendor conformance. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { CourseFactory } from "../../../apps/web/e2e/factories/course.factory";
import { CategoryFactory } from "../../../apps/web/e2e/factories/category.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";
import { SCORM_PACKAGE_HANDLES as SCO } from "../../../apps/web/e2e/data/scorm/handles";
import { openCreateScormCoursePageFlow } from "../../../apps/web/e2e/flows/courses/open-create-scorm-course-page.flow";
import { fillCreateScormCourseFormFlow } from "../../../apps/web/e2e/flows/courses/fill-create-scorm-course-form.flow";
import { submitCreateScormCourseFormFlow } from "../../../apps/web/e2e/flows/courses/submit-create-scorm-course-form.flow";
import { startLearningFlow } from "../../../apps/web/e2e/flows/learning/start-learning.flow";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = process.env.SPRINT_QA_OUTPUT ?? `${root}.local/sprint/screenshots`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  baseURL: "http://localhost:5173",
  locale: "pt-AO",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const api = new FixtureApiClient("http://localhost:3000");
const courses = new CourseFactory(api),
  categories = new CategoryFactory(api);
const results: string[] = [];
const startedAt = Date.now();
let courseId: string | undefined, categoryId: string | undefined;
try {
  await page.goto("/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, "http://localhost:5173");
  const title = `SCORM fictício — ${Date.now()}`;
  const category = await categories.create({ title: `SCORM QA ${Date.now()}`, language: "pt-AO" });
  categoryId = category.id;
  await openCreateScormCoursePageFlow(page);
  await fillCreateScormCourseFormFlow(page, {
    title,
    categoryTitle: category.title,
    language: "pt-AO",
    description:
      "Ensaio sintético MIT do upstream; pacote em inglês, sem validação de fornecedor independente.",
    packagePath: `${root}apps/web/e2e/data/scorm/files/single-scorm.zip`,
  });
  page.on("response", (response: any) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith("/api/scorm")) console.log(`SCORM HTTP ${response.status()} ${path}`);
  });
  await submitCreateScormCourseFormFlow(page);
  console.log("SCORM form submitted");
  await expect
    .poll(async () => Boolean(await courses.findByTitle(title, "pt-AO")), { timeout: 60000 })
    .toBe(true);
  const course = await courses.findByTitle(title, "pt-AO");
  courseId = course!.id;
  const detail = await courses.getById(courseId, "pt-AO");
  const lessonId = detail.chapters[0].lessons[0].id;
  await courses.update(courseId, { status: "published", language: "pt-AO" });
  await courses.setStudentMode(courseId, true);
  results.push(
    "ZIP imported through real UI and published through native API; synthetic upstream MIT package",
  );
  await page.goto(`/course/${courseId}`);
  await startLearningFlow(page);
  await expect(page).toHaveURL(new RegExp(`/lesson/${lessonId}$`));
  const frame = () => page.getByTestId(LEARNING_HANDLES.SCORM_IFRAME).contentFrame();
  await expect(frame().getByTestId(SCO.SINGLE_TITLE)).toBeVisible();
  await expect(frame().getByTestId(SCO.ENTRY)).toHaveText("ab-initio");
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().includes("/scorm/runtime/commit") && r.status() === 201,
    ),
    frame().getByTestId(SCO.COMMIT_PROGRESS_BUTTON).click(),
  ]);
  await page.reload();
  await expect(frame().getByTestId(SCO.ENTRY)).toHaveText("resume");
  results.push("Actual iframe initialized, persisted a checkpoint and resumed after reload");
  await page.getByTestId(LEARNING_HANDLES.SCORM_FULLSCREEN_BUTTON).click();
  await expect(page.getByTestId(LEARNING_HANDLES.SCORM_ROOT)).toHaveAttribute(
    "data-fullscreen",
    "true",
  );
  await page.getByTestId(LEARNING_HANDLES.SCORM_FULLSCREEN_BUTTON).click();
  await expect(page.getByTestId(LEARNING_HANDLES.SCORM_ROOT)).toHaveAttribute(
    "data-fullscreen",
    "false",
  );
  results.push("Learner player fullscreen navigation works");
  await page.screenshot({ path: `${output}/10-scorm-player.png`, fullPage: true });
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().includes("/scorm/runtime/finish") && r.status() === 201,
    ),
    frame().getByTestId(SCO.FINISH_LESSON_BUTTON).click(),
  ]);
  await expect
    .poll(
      async () => {
        const r = await api.api.courseControllerGetCourse({ id: courseId!, language: "pt-AO" });
        return r.data.data.chapters[0].lessons.find((l: any) => l.id === lessonId)?.status;
      },
      { timeout: 15000 },
    )
    .toBe("completed");
  results.push(
    "Real LMSFinish persisted native learner completion; admin using supported student mode",
  );
  console.log(JSON.stringify({ results, elapsedMs: Date.now() - startedAt }));
  await writeFile(
    `${root}.local/sprint/browser-scorm.json`,
    JSON.stringify(
      {
        results,
        elapsedMs: Date.now() - startedAt,
        package: "upstream synthetic MIT, not independent conformance",
        actor: "admin in supported student mode",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: `${output}/10-scorm-failure.png`, fullPage: true });
  await writeFile(
    `${root}.local/sprint/scorm-failure-dom.txt`,
    await page.locator("body").innerText(),
  );
  throw error;
} finally {
  if (courseId) {
    await courses.update(courseId, { status: "draft", language: "pt-AO" });
    await courses.delete(courseId);
  }
  if (categoryId) await categories.delete(categoryId);
  await context.close();
  await browser.close();
}
