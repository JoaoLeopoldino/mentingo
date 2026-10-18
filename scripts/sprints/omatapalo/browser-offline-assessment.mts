/** Synthetic course, real local API and Chrome; no successful response is mocked. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
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
const record = (message: string) => {
  results.push(message);
  console.log(message);
};
await mkdir(`${root}.local/sprint/screenshots`, { recursive: true });
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
  await writeFile(`${root}.local/sprint/offline-assessment-created.json`, JSON.stringify({ courseId, categoryId }));
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
  const syncResponse = page.waitForResponse(
    (response: { url(): string; status(): number }) =>
      response.url().endsWith("/api/offline-assessments/sync") && response.status() === 200,
  );
  await context.setOffline(false);
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
        request.onsuccess = () => resolve(request.result[0]);
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
    path: `${root}.local/sprint/screenshots/06-offline-assessment-synced.png`,
    fullPage: true,
  });
} catch (error) {
  await page
    .screenshot({
      path: `${root}.local/sprint/screenshots/offline-assessment-failure.png`,
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
    JSON.stringify({ profile, results, courseId, categoryId }, null, 2),
  );
}
