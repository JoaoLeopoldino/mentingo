/** Synthetic course, real local API and Chrome; no successful response is mocked. */
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { CourseFactory } from "../../../apps/web/e2e/factories/course.factory";
import { CurriculumFactory } from "../../../apps/web/e2e/factories/curriculum.factory";
import { CategoryFactory } from "../../../apps/web/e2e/factories/category.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const baseURL = "http://localhost:5173";
const profile = `${root}.local/sprint/offline-assessment-profile-${Date.now()}`;
const results: string[] = [];
const startedAt = Date.now();
const record = (message: string) => {
  results.push(message);
  console.log(message);
};
const output = process.env.SPRINT_QA_OUTPUT ?? `${root}.local/sprint/screenshots`;
await mkdir(output, { recursive: true });
const launch = () =>
  chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: true,
    locale: "pt-AO",
    viewport: { width: 1200, height: 1000 },
  });
let context = await launch();
let page = await context.newPage();
page.setDefaultTimeout(60000);
const api = new FixtureApiClient("http://localhost:3000");
const courses = new CourseFactory(api);
const curriculum = new CurriculumFactory(api);
const categories = new CategoryFactory(api);
let courseId: string | undefined;
let categoryId: string | undefined;
try {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, baseURL);
  categoryId = (
    await categories.create({ title: `Offline fictício ${Date.now()}`, language: "pt-AO" })
  ).id;
  const course = await courses.create({
    title: "Segurança — avaliação offline fictícia",
    categoryId,
    language: "pt-AO",
  });
  courseId = course.id;
  await writeFile(
    `${root}.local/sprint/offline-assessment-created.json`,
    JSON.stringify({ courseId, categoryId }),
  );
  const chapter = await curriculum.createChapter({ courseId, title: "Operações em Huíla" });
  const quiz = await curriculum.createQuizLesson(courseId, {
    chapterId: chapter.id,
    title: "Avaliação de segurança",
    thresholdScore: 50,
    questions: [
      {
        type: "single_choice",
        title: "Que equipamento protege a cabeça?",
        language: "pt-AO",
        displayOrder: 1,
        options: [
          {
            optionText: "Capacete de protecção",
            isCorrect: true,
            displayOrder: 1,
            language: "pt-AO",
          },
          { optionText: "Telemóvel", isCorrect: false, displayOrder: 2, language: "pt-AO" },
        ],
      },
    ],
  });
  await courses.update(courseId, { language: "pt-AO", status: "published" });
  await courses.setStudentMode(courseId, true);
  await page.goto(`${baseURL}/course/${courseId}`);
  await page.getByTestId("offline-download").click();
  await expect(page.getByRole("status").filter({ hasText: "Disponível offline" })).toBeVisible();
  await page.getByRole("link", { name: "Descargas offline" }).click();
  await expect(page.getByTestId("offline-quiz")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
  });
  record("Real signed assessment downloaded without answer keys");
  await context.setOffline(true);
  await page.getByRole("radio", { name: "Capacete de protecção" }).check();
  await page.screenshot({ path: `${output}/06-offline-quiz-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/06-offline-quiz-mobile.png`, fullPage: true });
  const mobileWidth = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(mobileWidth.document).toBeLessThanOrEqual(mobileWidth.viewport + 1);
  record(
    `Offline quiz mobile horizontal overflow: ${Math.max(0, mobileWidth.document - mobileWidth.viewport)}px`,
  );
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.getByTestId("offline-quiz-submit").click();
  await expect(page.getByTestId("offline-attempt-status")).toContainText("sincronização pendente");
  await context.close();
  context = await launch();
  await context.setOffline(true);
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`${baseURL}/offline-learning`);
  await expect(page.getByTestId("offline-attempt-status")).toContainText("sincronização pendente");
  record("Offline answers survive closing and reopening Chrome");
  await page.screenshot({ path: `${output}/06-offline-assessment-pending.png`, fullPage: true });
  if (process.env.SPRINT_TEST_ASSESSMENT_CHANGE === "1") {
    await api.api.lessonControllerBetaUpdateLesson(
      { language: "pt-AO", title: "Avaliação de segurança actualizada" },
      { id: quiz.id },
    );
    await context.setOffline(false);
    await expect(page.getByTestId("offline-recovery")).toContainText(
      "A avaliação ou o ciclo de formação mudou",
      { timeout: 45000 },
    );
    const download = page.waitForEvent("download");
    await page
      .getByTestId("offline-recovery")
      .getByRole("button", { name: "Exportar respostas originais" })
      .click();
    const file = await download;
    const exported = JSON.parse(await readFile((await file.path())!, "utf8"));
    expect(exported.attempt.body.answers).toHaveLength(1);
    expect(
      exported.attempt.review.questions[0].options.some(
        (option: any) => option.label === "Capacete de protecção",
      ),
    ).toBe(true);
    expect(exported.attempt.failureStatus).toBe(409);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByTestId("offline-recovery")
      .getByRole("button", { name: "Arquivar para revisão" })
      .click();
    await expect(page.getByTestId("offline-recovery")).toContainText("Arquivada neste dispositivo");
    await expect(
      page.getByRole("alert").filter({ hasText: "Descarregue novamente a formação" }),
    ).toBeVisible();
    await page.screenshot({ path: `${output}/09-offline-changed-assessment.png`, fullPage: true });
    await page.goto(`${baseURL}/course/${courseId}`);
    await page.getByTestId("offline-download").click();
    await expect(page.getByRole("status").filter({ hasText: "Disponível offline" })).toBeVisible();
    await page.getByRole("link", { name: "Descargas offline" }).click();
    await expect(page.getByTestId("offline-quiz")).toBeVisible();
    await context.setOffline(true);
    await page.getByRole("radio", { name: "Capacete de protecção" }).check();
    await page.getByTestId("offline-quiz-submit").click();
    await expect(page.getByTestId("offline-attempt-status")).toContainText(
      "sincronização pendente",
    );
    record(
      "Real HTTP 409: original answers exported and archived, stale snapshot blocked, fresh download permits a separate attempt",
    );
  }
  const recoveryMode = process.env.SPRINT_TEST_AUTH_RECOVERY === "1";
  if (recoveryMode) {
    const sessionCookies = await context.cookies();
    await context.clearCookies();
    await context.setOffline(false);
    await expect(page.getByTestId("offline-recovery")).toContainText("A sessão expirou", {
      timeout: 45000,
    });
    await expect(page.getByTestId("offline-attempt-status")).toContainText("requer revisão");
    await page.screenshot({ path: `${output}/09-offline-session-recovery.png`, fullPage: true });
    await context.addCookies(sessionCookies);
    record(
      "Real HTTP 401 preserves original answers; recovery offers explicit retry after restoring authentication",
    );
  }
  const syncResponse = page.waitForResponse(
    (response: { url(): string; status(): number }) =>
      response.url().endsWith("/api/offline-assessments/sync") && response.status() === 200,
  );
  if (recoveryMode)
    await page
      .getByTestId("offline-recovery")
      .getByRole("button", { name: "Repetir sincronização" })
      .click();
  else await context.setOffline(false);
  const receipt = (await (await syncResponse).json()).data;
  expect(receipt.score).toBe(100);
  expect(receipt.state).toBe("synced");
  await expect(page.getByTestId("offline-attempt-status")).toContainText("Validada pelo servidor");
  await expect(page.getByTestId("offline-attempt-status")).toContainText("100%");
  // Repeat the exact operation retrieved from IndexedDB through the generated client.
  const operation = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("mentingo-private-learning");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<any>((resolve, reject) => {
        const request = database.transaction("operations").objectStore("operations").getAll();
        request.onsuccess = () => resolve(request.result.find((item: any) => !item.archivedAt));
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
  const retry = await api.api.offlineAssessmentControllerSubmitOfflineAssessment(operation.body);
  expect(retry.data.data.attemptId).toBe(receipt.attemptId);
  expect(retry.data.data.receivedAt).toBe(receipt.receivedAt);
  record(
    "Reconnect grades on the real server; repeated submission returns the same persisted receipt",
  );
  const native = await api.api.lessonControllerGetLessonById(quiz.id, { language: "pt-AO" });
  expect(native.data.data.lessonCompleted).toBe(true);
  record("Native lesson progress reports completion after synchronization");
  await page.screenshot({
    path: `${output}/06-offline-assessment-synced.png`,
    fullPage: true,
  });
} catch (error) {
  await page
    .screenshot({
      path: `${output}/offline-assessment-failure.png`,
      fullPage: true,
    })
    .catch(() => {});
  await writeFile(
    `${root}.local/sprint/offline-assessment-failure-dom.txt`,
    await page
      .locator("body")
      .innerText()
      .catch(() => "Unavailable"),
  );
  throw error;
} finally {
  await context.close();
  if (courseId) await courses.delete(courseId).catch(() => {});
  if (categoryId) await categories.delete(categoryId).catch(() => {});
  await writeFile(
    `${root}.local/sprint/browser-offline-assessment.json`,
    JSON.stringify(
      { profile, results, courseId, categoryId, elapsedMs: Date.now() - startedAt },
      null,
      2,
    ),
  );
}
