/** Unmodified independent Rustici SCORM 1.2 package; real Chrome, API and storage. */
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
  const title = `SCORM Rustici independente — ${Date.now()}`;
  const category = await categories.create({ title: `SCORM QA ${Date.now()}`, language: "pt-AO" });
  categoryId = category.id;
  await openCreateScormCoursePageFlow(page);
  await fillCreateScormCourseFormFlow(page, {
    title,
    categoryTitle: category.title,
    language: "pt-AO",
    description:
      "Pacote independente Rustici Golf, SCORM 1.2, CC BY 3.0 US; conteúdo original em inglês.",
    packagePath: `${root}.local/sprint/golf-scorm12.zip`,
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
  await api.api.courseControllerUpdateHasCertificate(courseId, { hasCertificate: true });
  await courses.update(courseId, { status: "published", language: "pt-AO" });
  await courses.setStudentMode(courseId, true);
  results.push("Unmodified Rustici ZIP imported through real UI and published through native API");
  await page.goto(`/course/${courseId}`);
  await startLearningFlow(page);
  await expect(page).toHaveURL(new RegExp(`/lesson/${lessonId}$`));
  const frame = () => page.getByTestId(LEARNING_HANDLES.SCORM_IFRAME).contentFrame();
  const content = () => frame().frameLocator("#contentFrame");
  const dialogs: string[] = [];
  page.on("dialog", async (dialog: any) => {
    dialogs.push(dialog.message());
    if (dialog.type() === "confirm") await dialog.accept();
    else await dialog.dismiss();
  });
  await expect(content().locator("h1")).toContainText("Play of the game");
  for (let i = 0; i < 3; i++) await frame().locator("#butNext").click();
  await expect(content().locator("h1")).toContainText("Other Scoring");
  // Exit uses the package's own LMSFinish, so the bookmark is durably committed.
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().includes("/scorm/runtime/finish") && r.status() === 201,
    ),
    frame().locator("#butExit").click(),
  ]);
  await page.reload();
  await expect(content().locator("h1")).toContainText("Other Scoring");
  expect(dialogs.some((message) => message.includes("resume"))).toBe(true);
  results.push(
    "Independent package navigation, native exit and persisted page-3 bookmark resumed after reload",
  );
  await page.screenshot({ path: `${output}/18-independent-scorm-resume.png`, fullPage: true });
  for (let i = 3; i < 14; i++) await frame().locator("#butNext").click();
  await expect(content().getByRole("heading", { name: "Knowledge Check" })).toBeVisible();
  // The sample deliberately marks correct answers for interoperability testing.
  // Interact with actual inputs; never inject an LMS result or call the runtime ourselves.
  const radios = content().locator(".correctAnswer input[type=radio]");
  for (let i = 0; i < (await radios.count()); i++) await radios.nth(i).check();
  const numbers = content().locator(".correctAnswer input[type=text]");
  for (let i = 0; i < (await numbers.count()); i++) {
    const expected = (await numbers.nth(i).locator("..").innerText()).match(/\((\d+)\)/)?.[1];
    expect(expected).toBeTruthy();
    await numbers.nth(i).fill(expected!);
  }
  await content().getByRole("button", { name: "Submit Answers" }).click();
  await expect(content().getByRole("heading", { name: "Score: 100", exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/18-independent-scorm-complete.png`, fullPage: true });
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().includes("/scorm/runtime/finish") && r.status() === 201,
    ),
    frame().locator("#butExit").click(),
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
  const actor = (await api.api.authControllerCurrentUser()).data.data;
  const history = async () =>
    (
      await api.api.certificatesControllerGetLearningHistory({
        userId: actor.id,
        courseId: courseId!,
      })
    ).data.data;
  await expect.poll(async () => (await history()).certificates.length, { timeout: 30000 }).toBe(1);
  const completed = await history();
  expect(Number(completed.scormAttempts[0].scoreRaw)).toBe(100);
  results.push(
    "Score 100 persisted in authenticated history and one certificate issued automatically",
  );
  await writeFile(
    `${root}.local/sprint/scorm-demo.json`,
    JSON.stringify(
      { courseId, userId: actor.id, certificateId: completed.certificates[0].id },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ results, elapsedMs: Date.now() - startedAt }));
  await writeFile(
    `${root}.local/sprint/browser-independent-scorm.json`,
    JSON.stringify(
      {
        results,
        elapsedMs: Date.now() - startedAt,
        package: "Rustici RuntimeBasicCalls_SCORM12, original CC BY 3.0 US",
        actor: "admin in supported student mode",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: `${output}/18-independent-scorm-failure.png`, fullPage: true });
  await writeFile(
    `${root}.local/sprint/scorm-failure-dom.txt`,
    await page.locator("body").innerText(),
  );
  throw new Error(error instanceof Error ? error.message : String(error));
} finally {
  if (courseId && process.env.SPRINT_QA_CLEANUP === "true") {
    await courses.update(courseId, { status: "draft", language: "pt-AO" });
    await courses.delete(courseId);
  }
  if (categoryId && process.env.SPRINT_QA_CLEANUP === "true") await categories.delete(categoryId);
  await context.close();
  await browser.close();
}
