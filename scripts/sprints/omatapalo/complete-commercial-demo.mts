/** Complete the retained fictional Safety course through the learner's actual Chrome UI. */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";
import { startLearningFlow } from "../../../apps/web/e2e/flows/learning/start-learning.flow";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const demo = JSON.parse(await readFile(`${root}.local/sprint/commercial-demo.json`, "utf8"));
if (!/^enterprise-employee-[a-f0-9]+@example\.com$/.test(demo.personas.learner)) {
  throw new Error("Only the retained fictional local learner is allowed");
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "pt-AO",
  timezoneId: "Africa/Luanda",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const startedAt = new Date().toISOString();
const started = Date.now();
const api = new FixtureApiClient("http://localhost:3000");
try {
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill(demo.personas.learner);
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("Password123@");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, "http://localhost:5173");
  const user = (await api.api.authControllerCurrentUser()).data.data;
  if (!user) throw new Error("Native authentication failed");
  const history = async () =>
    (
      await api.api.certificatesControllerGetLearningHistory({
        userId: user.id,
        courseId: demo.courseId,
      })
    ).data.data;
  const previous = await history();
  const course = (await api.api.courseControllerGetCourse({ id: demo.courseId, language: "pt-AO" }))
    .data.data;
  expect(course.hasCertificate).toBe(true);
  await page.goto(`http://localhost:5173/course/${demo.courseId}`);
  if (!previous.certificates.some((certificate) => certificate.status === "active")) {
    await startLearningFlow(page);
    await expect(page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toHaveText(
      "Segurança nas três províncias",
    );
    await page.getByTestId(LEARNING_HANDLES.NEXT_LESSON_BUTTON).click();
    await expect(page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toHaveText(
      "Avaliação de segurança",
    );
    await page.locator('input[name^="singleAnswerQuestions."]').first().check();
    await page.getByTestId(LEARNING_HANDLES.QUIZ_SUBMIT_BUTTON).click();
    await expect(page.getByTestId(LEARNING_HANDLES.QUIZ_SCORE)).toContainText("100");
    await expect
      .poll(
        async () =>
          (await history()).certificates.filter((certificate) => certificate.status === "active")
            .length,
      )
      .toBe(1);
    await page.screenshot({
      path: `${root}.local/sprint/screenshots/18-commercial-quiz-completed.png`,
      fullPage: true,
    });
  }
  const completed = await history();
  expect(
    completed.certificates.filter((certificate) => certificate.status === "active"),
  ).toHaveLength(1);
  expect(
    completed.assessmentAttempts.some((attempt) => Number(attempt.scorePercentage) === 100),
  ).toBe(true);
  await page.goto(`http://localhost:5173/learning-history/${demo.courseId}/${user.id}`);
  await expect(page.getByTestId("learning-cycle-1")).toContainText("Válido");
  await page.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-active-certificate.png`,
    fullPage: true,
  });
  const certificate = completed.certificates.find((candidate) => candidate.status === "active")!;
  const shared = (
    await api.api.certificatesControllerCreateCertificateShareLink({
      certificateId: certificate.id,
      language: "pt-AO",
    })
  ).data;
  const publicPage = await browser.newPage();
  const response = await publicPage.goto(shared.shareUrl);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await publicPage.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-public-certificate.png`,
    fullPage: true,
  });
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    courseId: demo.courseId,
    userId: user.id,
    certificateId: certificate.id,
    shareUrl: shared.shareUrl,
    reusedCompletedAttempt: previous.certificates.length > 0,
    results: [
      "Native learner login and text lesson navigation",
      "Native quiz submission, score 100 and automatic single certificate",
      "Learner-scoped historical evidence and anonymous no-store public verification",
    ],
    limits:
      "No automatic professional competency rating, external integration, physical Android or video validation is implied.",
  };
  await writeFile(
    `${root}.local/sprint/commercial-completion.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await context.close();
  await browser.close();
}
