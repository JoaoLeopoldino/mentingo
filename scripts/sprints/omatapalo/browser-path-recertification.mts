/** Only a freshly prepared integrated fictional course may be retaken. All transitions use native APIs/Chrome. */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";
import { startLearningFlow } from "../../../apps/web/e2e/flows/learning/start-learning.flow";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const demo = JSON.parse(await readFile(`${root}.local/sprint/integrated-demo.json`, "utf8"));
if (
  Date.now() - Date.parse(demo.startedAt) > 30 * 60 * 1000 ||
  !/^enterprise-employee-[a-f0-9]+@example\.com$/.test(demo.fixture.employee.email)
)
  throw new Error("Prepare a fresh integrated demo; never reset older fixtures");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const started = Date.now(),
  results: string[] = [];
async function login(email: string, password: string) {
  const context = await browser.newContext({
    locale: "pt-AO",
    timezoneId: "Africa/Luanda",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill(email);
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill(password);
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  const api = new FixtureApiClient("http://localhost:3000");
  await api.syncFromContext(context, "http://localhost:5173");
  return { page, api };
}
try {
  const admin = await login("admin+localhost@example.com", "password"),
    learner = await login(demo.fixture.employee.email, "Password123@"),
    manager = await login(demo.fixture.manager.email, "Password123@");
  const globalSettings = (await admin.api.api.settingsControllerGetPublicGlobalSettings()).data.data;
  if (!globalSettings.learningPathsEnabled) await admin.api.api.settingsControllerUpdateLearningPathsEnabled();
  const path = (
    await admin.api.api.learningPathControllerCreateLearningPath({
      language: "pt-AO",
      title: `Percurso de segurança — SIMULAÇÃO ${Date.now()}`,
      description:
        "Dados sintéticos; recertificação explícita após novas conclusões. Sem integração real com Primavera.",
      status: "published",
      includesCertificate: true,
    })
  ).data.data;
  await admin.api.api.learningPathCourseControllerAddCoursesToLearningPath(path.id, {
    courseIds: [demo.fixture.courseId],
  });
  await admin.api.api.learningPathEnrollmentControllerEnrollUsersToLearningPath(path.id, {
    studentIds: [demo.fixture.employee.id],
  });
  const history = async () =>
    (
      await learner.api.api.learningPathCertificateControllerHistory({
        userId: demo.fixture.employee.id,
        learningPathId: path.id,
      })
    ).data.data;
  await expect.poll(async () => (await history()).length, { timeout: 60000 }).toBe(1);
  const before = (await history())[0];
  expect(before.completionSnapshot[0].learningCycle).toBe(1);
  const shared = (
    await learner.api.api.learningPathCertificateControllerCreateCertificateShareLink({
      certificateId: before.id,
      language: "pt-AO",
    })
  ).data;
  const publicPage = await browser.newPage();
  expect((await publicPage.goto(shared.shareUrl))?.status()).toBe(200);
  await expect(publicPage).toHaveTitle(/Certificado/);
  await publicPage.screenshot({
    path: `${root}.local/sprint/screenshots/22-path-public-initial.png`,
    fullPage: true,
  });
  results.push(
    "Native learning path enrollment issued a course-cycle snapshot credential; real canonical anonymous page rendered in pt-AO",
  );
  const reason = { reason: "Revogação fictícia para ensaio de recertificação fundamentada" };
  expect(
    (
      await manager.api.api.learningPathCertificateControllerRevoke(before.id, reason, {
        validateStatus: () => true,
      })
    ).status,
  ).toBe(403);
  await admin.api.api.learningPathCertificateControllerRevoke(before.id, reason);
  expect((await publicPage.goto(shared.shareUrl))?.status()).toBe(404);
  expect(
    (
      await learner.api.api.learningPathCertificateControllerGetCertificate({
        userId: demo.fixture.employee.id,
        learningPathId: path.id,
        language: "pt-AO",
      })
    ).data,
  ).toBeNull();
  expect(
    (
      await admin.api.api.learningPathCertificateControllerRenew(
        before.id,
        { reason: "Nova conclusão necessária para recertificação" },
        { validateStatus: () => true },
      )
    ).status,
  ).toBe(409);
  results.push(
    "Operational manager cannot revoke; administrative revocation invalidates public/current credential; stale training cannot recertify",
  );
  await admin.api.api.certificatesControllerResetCourseCertificates(demo.fixture.courseId, {
    scope: "users",
    userIds: [demo.fixture.employee.id],
    sendEmail: false,
  });
  await learner.page.goto(`http://localhost:5173/course/${demo.fixture.courseId}`);
  await startLearningFlow(learner.page);
  await expect(learner.page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toHaveText(
    "Segurança nas três províncias",
  );
  await learner.page.getByTestId(LEARNING_HANDLES.NEXT_LESSON_BUTTON).click();
  await expect(learner.page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toHaveText(
    "Avaliação de segurança",
  );
  await learner.page.locator('input[name^="singleAnswerQuestions."]').first().check();
  await learner.page.getByTestId(LEARNING_HANDLES.QUIZ_SUBMIT_BUTTON).click();
  await expect(learner.page.getByTestId(LEARNING_HANDLES.QUIZ_SCORE)).toContainText("100");
  const courseHistory = async () =>
    (
      await learner.api.api.certificatesControllerGetLearningHistory({
        userId: demo.fixture.employee.id,
        courseId: demo.fixture.courseId,
      })
    ).data.data;
  await expect.poll(async () => (await courseHistory()).assessmentAttempts.length).toBe(2);
  const renewal = { reason: "Recertificação após nova conclusão nativa do ciclo de formação" };
  const renewed = (await admin.api.api.learningPathCertificateControllerRenew(before.id, renewal))
    .data.data;
  const retried = (await admin.api.api.learningPathCertificateControllerRenew(before.id, renewal))
    .data.data;
  expect(retried.id).toBe(renewed.id);
  expect(renewed.completionSnapshot[0].learningCycle).toBe(2);
  const after = await history();
  expect(after).toHaveLength(2);
  const previous = after.find((x) => x.id === before.id)!;
  expect(previous.issuedAt).toBe(before.issuedAt);
  expect(previous.completionSnapshot).toEqual(before.completionSnapshot);
  expect(previous.revocationReason).toBe(reason.reason);
  const sharedNew = (
    await learner.api.api.learningPathCertificateControllerCreateCertificateShareLink({
      certificateId: renewed.id,
      language: "pt-AO",
    })
  ).data;
  expect((await publicPage.goto(sharedNew.shareUrl))?.status()).toBe(200);
  await publicPage.screenshot({
    path: `${root}.local/sprint/screenshots/22-path-public-renewed.png`,
    fullPage: true,
  });
  expect((await publicPage.goto(shared.shareUrl))?.status()).toBe(404);
  await learner.page.goto(
    `http://localhost:5173/learning-history/${demo.fixture.courseId}/${demo.fixture.employee.id}`,
  );
  await expect(learner.page.getByTestId("learning-cycle-2")).toContainText("Válido");
  await learner.page.screenshot({
    path: `${root}.local/sprint/screenshots/22-path-course-cycles.png`,
    fullPage: true,
  });
  const teamHistory = (
    await manager.api.api.learningPathCertificateControllerHistory({
      userId: demo.fixture.employee.id,
      learningPathId: path.id,
    })
  ).data.data;
  expect(teamHistory).toHaveLength(2);
  results.push(
    "Learner genuinely retook native lessons/quiz in Chrome; second course and path credentials preserve prior attempts, revocation and immutable completion snapshots; repeated renewal is idempotent",
  );
  await writeFile(
    `${root}.local/sprint/path-recertification.json`,
    JSON.stringify(
      {
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        pathId: path.id,
        userId: demo.fixture.employee.id,
        courseId: demo.fixture.courseId,
        certificates: after,
        assessmentAttempts: (await courseHistory()).assessmentAttempts.length,
        results,
        limits:
          "Administrative revoke/renew commands exercised via native APIs; learner retake/public certificates through Chrome. No dedicated learning-path history management screen, offline SCORM, Android or external credential service is implied.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, elapsedMs: Date.now() - started, results }));
} finally {
  await browser.close();
}
