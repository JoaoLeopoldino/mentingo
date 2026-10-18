/** Four local fictional personas, preserving the previously demonstrated competency plan. */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SYSTEM_ROLE_SLUGS } from "../../../packages/shared/src/constants/permissions";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { UserFactory } from "../../../apps/web/e2e/factories/user.factory";
import { CourseFactory } from "../../../apps/web/e2e/factories/course.factory";
import { CategoryFactory } from "../../../apps/web/e2e/factories/category.factory";
import { CurriculumFactory } from "../../../apps/web/e2e/factories/curriculum.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { seedCompetencyQaCredential } from "./seed-competency-qa-credential.mts";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const previous = JSON.parse(
  await readFile(`${root}.local/sprint/enterprise-demo.json`, "utf8"),
).fixture;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const contexts: any[] = [];
const started = Date.now();
async function login(email: string, password: string) {
  const context = await browser.newContext({
    locale: "pt-AO",
    timezoneId: "Africa/Luanda",
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(context);
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
  const admin = await login("admin+localhost@example.com", "password");
  const suffix = randomUUID().slice(0, 8);
  const training = await new UserFactory(admin.api).create({
    email: `enterprise-manager-${suffix}@example.com`,
    firstName: "Gestor de formação",
    lastName: `Fictício ${suffix}`,
    language: "pt-AO",
    roleSlugs: [SYSTEM_ROLE_SLUGS.CONTENT_CREATOR],
  });
  await seedCompetencyQaCredential(training.id, training.email);
  const author = await login(training.email, "Password123@");
  const category = await new CategoryFactory(admin.api).create({
    title: `Demonstração empresarial fictícia ${suffix}`,
    language: "pt-AO",
  });
  const courses = new CourseFactory(author.api),
    curriculum = new CurriculumFactory(author.api);
  const course = await courses.create({
    title: `Segurança no Trabalho — operações fictícias ${suffix}`,
    categoryId: category.id,
    language: "pt-AO",
    description:
      "Demonstração com operações fictícias em Luanda, Huíla e Benguela. Sem dados do cliente.",
    hasCertificate: true,
  });
  const chapter = await curriculum.createChapter({
    courseId: course.id,
    title: "Prevenção de acidentes",
  });
  // Use the native certificate-settings flow; do not assume the creation response applied it.
  await author.api.api.courseControllerUpdateHasCertificate(course.id, { hasCertificate: true });
  expect((await courses.getById(course.id, "pt-AO")).hasCertificate).toBe(true);
  await curriculum.createContentLesson(course.id, {
    chapterId: chapter.id,
    title: "Segurança nas três províncias",
    description:
      "<h2>Luanda, Huíla e Benguela</h2><p>O colaborador verifica o equipamento, utiliza capacete e comunica situações de risco ao gestor operacional.</p><p>Esta é uma formação fictícia para demonstração técnica. Não substitui procedimentos aprovados de segurança.</p>",
  });
  await curriculum.createQuizLesson(course.id, {
    chapterId: chapter.id,
    title: "Avaliação de segurança",
    thresholdScore: 100,
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
  await courses.update(course.id, { status: "published", language: "pt-AO" });
  await admin.api.api.courseControllerEnrollCourses(course.id, {
    studentIds: [previous.employee.id],
  });
  const learner = await login(previous.employee.email, "Password123@");
  await learner.page.goto(`http://localhost:5173/course/${course.id}`);
  await expect(
    learner.page.getByRole("heading", { name: course.title, exact: true }),
  ).toBeVisible();
  await learner.page.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-learner.png`,
    fullPage: true,
  });
  const manager = await login(previous.manager.email, "Password123@");
  await manager.page.goto("http://localhost:5173/competencies");
  await expect(manager.page.getByTestId("competencies-workspace")).toBeVisible();
  await manager.page.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-manager.png`,
    fullPage: true,
  });
  await author.page.goto(`http://localhost:5173/course/${course.id}`);
  await expect(author.page.getByRole("heading", { name: course.title, exact: true })).toBeVisible();
  await author.page.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-training-manager.png`,
    fullPage: true,
  });
  await admin.page.goto("http://localhost:5173/reports");
  await expect(admin.page.getByRole("heading", { name: /Relatórios/ }).first()).toBeVisible();
  await expect(
    admin.page
      .getByRole("region", { name: "Indicadores de síntese", exact: true })
      .locator("article"),
  ).toHaveCount(4);
  await admin.page.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-executive-reports.png`,
    fullPage: true,
  });
  const report = {
    source: "fictional local demonstration",
    elapsedMs: Date.now() - started,
    courseId: course.id,
    courseUrl: `http://localhost:5173/course/${course.id}`,
    personas: {
      administrator: "admin+localhost@example.com",
      trainingManager: training.email,
      operationalManager: previous.manager.email,
      learner: previous.employee.email,
    },
    competencyId: previous.competencyId,
    developmentPlanId: previous.planId,
    limits:
      "Training manager uses the native content-creator role. Safety course has native text/quiz/certificate enabled; its learner completion is not claimed by this preparation script. SCORM renewal/revocation uses the independently tested Rustici course. No video, classroom attendance or real integrations are fabricated.",
  };
  await writeFile(`${root}.local/sprint/commercial-demo.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  throw new Error(error instanceof Error ? error.message : String(error));
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
