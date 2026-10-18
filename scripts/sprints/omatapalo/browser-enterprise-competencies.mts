/** Local real Chrome demo. Fixture setup uses native APIs; decisions use the UI. No external customer data. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { seedCompetencyQaCredential } from "./seed-competency-qa-credential.mts";
import { SYSTEM_ROLE_SLUGS } from "../../../packages/shared/src/constants/permissions";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { GroupFactory } from "../../../apps/web/e2e/factories/group.factory";
import { UserFactory } from "../../../apps/web/e2e/factories/user.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = `${root}.local/sprint/screenshots`;
await mkdir(output, { recursive: true });
const started = Date.now();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const contexts: any[] = [];
const results: string[] = [];
async function login(email: string, password: string) {
  const context = await browser.newContext({
    locale: "pt-AO",
    timezoneId: "Africa/Luanda",
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e: Error) => console.log("page-error", e.message));
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill(email);
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill(password);
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  const api = new FixtureApiClient("http://localhost:3000");
  await api.syncFromContext(context, "http://localhost:5173");
  return { page, context, api };
}
async function save(page: any, form: any, endpoint: string, button = "Guardar") {
  console.log("submit", endpoint);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().endsWith(endpoint) && ["POST", "PUT"].includes(r.request().method()),
    ),
    form.getByRole("button", { name: button, exact: true }).click(),
  ]);
  const payload = await response.json();
  expect(response.status(), JSON.stringify(payload)).toBeLessThan(300);
  console.log("saved", endpoint, response.status());
  return payload.data;
}
async function profile(page: any, employeeId?: string) {
  await page.goto("http://localhost:5173/competencies");
  await expect(page.getByTestId("competencies-workspace")).toBeVisible();
  await page.getByRole("tab", { name: "Perfil do colaborador", exact: true }).click();
  if (employeeId) await page.getByLabel("Colaborador", { exact: true }).selectOption(employeeId);
  await expect(page.getByTestId("competency-development-plans")).toBeVisible();
}
async function decide(
  page: any,
  planId: string,
  action: string,
  rationale: string,
  activityId?: string,
) {
  const form = page.getByTestId(`competency-plan-decision-${planId}`);
  const card = page.getByTestId("competency-plan").filter({ has: form });
  const previousVersion = Number((await card.textContent()).match(/Revisão (\d+)/)?.[1]);
  console.log("decision", action, previousVersion);
  await form.getByLabel("Decisão sobre o plano", { exact: true }).selectOption(action);
  if (activityId)
    await form
      .getByLabel("Actividade (para declarar conclusão)", { exact: true })
      .selectOption(activityId);
  await form.getByLabel("Fundamentação da decisão", { exact: true }).fill(rationale);
  await save(page, form, `/api/competencies/development-plans/${planId}/decisions`);
  if (["complete", "cancel"].includes(action)) await expect(form).toHaveCount(0);
  else {
    await expect(card).toContainText(`Revisão ${previousVersion + 1}`);
    await expect(form.getByLabel("Fundamentação da decisão", { exact: true })).toHaveValue("");
  }
}
try {
  const admin = await login("admin+localhost@example.com", "password");
  const users = new UserFactory(admin.api);
  const groups = new GroupFactory(admin.api);
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const employee = await users.create({
    email: `enterprise-employee-${suffix.toLowerCase()}@example.com`,
    firstName: "Colaborador Luanda",
    lastName: `Fictício ${suffix}`,
    language: "pt-AO",
  });
  const manager = await users.create({
    email: `enterprise-manager-${suffix.toLowerCase()}@example.com`,
    firstName: "Gestor Luanda",
    lastName: `Fictício ${suffix}`,
    language: "pt-AO",
  });
  const unit = await groups.create({
    name: `Operações Luanda — fictício ${suffix}`,
    language: "pt-AO",
  });
  await admin.api.api.groupControllerSetUserGroups([unit.id], { userId: employee.id });
  await users.update(manager.id, {
    roleSlugs: [SYSTEM_ROLE_SLUGS.GROUP_MANAGER],
    managedGroupIds: [unit.id],
  });
  await seedCompetencyQaCredential(employee.id, employee.email);
  await seedCompetencyQaCredential(manager.id, manager.email);
  await profile(admin.page);
  await admin.page.getByRole("tab", { name: "Catálogo de competências", exact: true }).click();
  const frameworkForm = admin.page.getByTestId("competency-framework-form");
  await frameworkForm.getByLabel("Código", { exact: true }).fill(`OPS_${suffix}`);
  await frameworkForm.getByLabel("Nome", { exact: true }).fill(`Operações Angola ${suffix}`);
  await frameworkForm
    .getByLabel("Categorias (uma por linha)", { exact: true })
    .fill("Segurança\nOperação");
  const framework = await save(admin.page, frameworkForm, "/api/competencies/frameworks");
  const scaleForm = admin.page.getByTestId("competency-scale-form");
  await scaleForm.getByLabel("Código", { exact: true }).fill(`SCALE_${suffix}`);
  await scaleForm.getByLabel("Nome", { exact: true }).fill(`Proficiência operacional ${suffix}`);
  await scaleForm.getByLabel(/Designações dos níveis/).fill("Iniciado\nAutónomo\nFormador");
  const scale = await save(admin.page, scaleForm, "/api/competencies/scales");
  const catalogForm = admin.page.getByTestId("competency-catalog-form");
  await catalogForm.getByLabel("Código", { exact: true }).fill(`EPI_${suffix}`);
  await catalogForm.getByLabel("Nome", { exact: true }).fill(`Utilização segura de EPI ${suffix}`);
  await catalogForm
    .getByLabel("Framework de competências (opcional)", { exact: true })
    .selectOption(framework.id);
  await catalogForm.getByLabel("Categoria", { exact: true }).selectOption("Segurança");
  await catalogForm
    .getByLabel("Escala reutilizável (opcional)", { exact: true })
    .selectOption(scale.id);
  const competency = await save(admin.page, catalogForm, "/api/competencies/catalog");
  const role = (
    await admin.api.api.competenciesControllerCreateCompetencyJobRole({
      code: `OP_${suffix}`,
      name: `Operador de obra ${suffix}`,
    })
  ).data.data;
  await admin.api.api.competenciesControllerSetCompetencyRequirement({
    jobRoleId: role.id,
    competencyId: competency.id,
    minimumLevel: 2,
    mandatory: true,
    expectedVersion: 0,
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveUntil: null,
    courseId: null,
    learningPathId: null,
  });
  await admin.api.api.competenciesControllerAssignCompetencyRole({
    userId: employee.id,
    jobRoleId: role.id,
    organizationalUnitId: unit.id,
  });
  results.push(
    "Administrator created framework, reusable scale and classified competency through Chrome",
  );
  await admin.page.screenshot({ path: `${output}/16-enterprise-admin.png`, fullPage: true });
  const learner = await login(employee.email, "Password123@");
  await profile(learner.page);
  await expect(
    learner.page.getByRole("tab", { name: "Catálogo de competências", exact: true }),
  ).toHaveCount(0);
  await expect(learner.page.getByTestId("competency-assessment-form")).toHaveCount(0);
  const planForm = learner.page.getByTestId("competency-plan-create");
  await planForm.getByLabel("Nome", { exact: true }).fill(`Plano EPI Luanda ${suffix}`);
  await planForm.getByLabel("Competência", { exact: true }).selectOption(competency.id);
  await planForm.getByLabel("Nível pretendido", { exact: true }).fill("2");
  await planForm.getByLabel("Prazo", { exact: true }).fill("2030-12-31T16:00");
  await planForm
    .getByLabel(/Actividades \(uma por linha/)
    .fill("Formação e prática supervisionada de EPI");
  const plan = await save(
    learner.page,
    planForm,
    "/api/competencies/development-plans",
    "Criar plano de desenvolvimento",
  );
  await decide(
    learner.page,
    plan.id,
    "request_approval",
    "Solicito desenvolvimento profissional para colmatar a lacuna",
  );
  await expect(
    learner.page.getByTestId("competency-plan").filter({ hasText: `Plano EPI Luanda ${suffix}` }),
  ).toContainText("Aguarda aprovação");
  results.push(
    "Employee sees only own profile, creates plan from an unmet requirement and requests approval",
  );
  const supervisor = await login(manager.email, "Password123@");
  await profile(supervisor.page, employee.id);
  await expect(
    supervisor.page.getByRole("tab", { name: "Catálogo de competências", exact: true }),
  ).toHaveCount(0);
  await decide(supervisor.page, plan.id, "approve", "Aprovo o plano e assumo o acompanhamento");
  await expect(supervisor.page.getByTestId("competency-plan")).toContainText("Em curso");
  results.push("Manager approves an authorised team member's plan");
  await profile(learner.page);
  const plans = (await learner.api.api.competenciesControllerGetDevelopmentPlans()).data.data;
  const activity = plans.activities.find((x) => x.planId === plan.id)!;
  await decide(
    learner.page,
    plan.id,
    "report_activity",
    "Declaro a realização da prática supervisionada",
    activity.id,
  );
  await decide(learner.page, plan.id, "submit", "Solicito observação e avaliação final do gestor");
  const proofForm = learner.page.getByTestId("competency-evidence-form");
  await proofForm.getByLabel("Competência", { exact: true }).selectOption(competency.id);
  await proofForm
    .getByLabel("Plano de desenvolvimento associado (opcional)", { exact: true })
    .selectOption(plan.id);
  await proofForm.getByLabel("Nível proposto", { exact: true }).fill("2");
  await proofForm
    .getByLabel("Origem da evidência", { exact: true })
    .fill("Prática presencial fictícia em Luanda");
  await proofForm
    .getByLabel("Descrição e fundamentação da evidência", { exact: true })
    .fill("Evidência fictícia da colocação e verificação segura dos EPI");
  const proof = await save(learner.page, proofForm, "/api/competencies/evidence");
  results.push(
    "Employee reports activity completion and submits evidence; proficiency is not automatically awarded",
  );
  await profile(supervisor.page, employee.id);
  await supervisor.page.getByRole("tab", { name: "Evidências pendentes", exact: true }).click();
  const filtersForm = supervisor.page.getByTestId("competency-filters");
  await filtersForm
    .getByLabel("Apenas colaboradores com evidências por rever", { exact: true })
    .check();
  const [filtered] = await Promise.all([
    supervisor.page.waitForResponse(
      (r: any) =>
        r.url().includes("/api/competencies/workspace?") &&
        r.url().includes("pendingEvidenceOnly=true"),
    ),
    filtersForm.getByRole("button", { name: "Aplicar filtros", exact: true }).click(),
  ]);
  expect((await filtered.json()).data.pagination.total).toBe(1);
  const pendingQueue = supervisor.page.getByTestId("competency-pending-queue");
  await expect(pendingQueue.getByTestId("competency-pending-evidence")).toHaveCount(1);
  await pendingQueue.getByRole("button", { name: "Rever evidência", exact: true }).click();
  await expect(supervisor.page.getByTestId("competency-evidence-form")).toBeVisible();
  const review = supervisor.page.getByTestId("competency-review-form");
  await review
    .getByLabel("Descrição e fundamentação da evidência", { exact: true })
    .selectOption(proof.id);
  await review
    .getByLabel("Fundamentação da decisão", { exact: true })
    .fill("Evidência presencial fictícia revista e aceite");
  await save(supervisor.page, review, "/api/competencies/evidence-reviews");
  const assessment = supervisor.page.getByTestId("competency-assessment-form");
  await assessment.getByLabel("Competência", { exact: true }).selectOption(competency.id);
  await assessment.getByLabel("Nível de proficiência", { exact: true }).fill("2");
  await assessment
    .getByLabel("Evidência de suporte aceite (opcional)", { exact: true })
    .selectOption(proof.id);
  await assessment
    .getByLabel("Fundamentação da decisão", { exact: true })
    .fill("Observação profissional formal: utilização autónoma e segura demonstrada");
  await save(
    supervisor.page,
    assessment,
    "/api/competencies/assessments",
    "Registar avaliação formal",
  );
  await decide(
    supervisor.page,
    plan.id,
    "complete",
    "Plano concluído com avaliação profissional formal suficiente",
  );
  await expect(supervisor.page.getByTestId("competency-plan")).toContainText(
    "Concluído com avaliação",
  );
  await supervisor.page.screenshot({ path: `${output}/16-enterprise-manager.png`, fullPage: true });
  results.push(
    "Manager reviews evidence, separately assesses proficiency and completes the plan with a linked decision",
  );
  await profile(learner.page);
  const completed = learner.page.getByTestId("competency-plan");
  await expect(completed).toContainText("Concluído com avaliação");
  await completed.getByText("Histórico do plano", { exact: true }).click();
  await expect(completed.locator("details li")).toHaveCount(6);
  await learner.page.screenshot({ path: `${output}/16-enterprise-employee.png`, fullPage: true });
  await learner.page
    .getByRole("tab", { name: "Matriz de competências da equipa", exact: true })
    .click();
  await expect(learner.page.getByTestId("competency-matrix")).toContainText("Requisito cumprido");
  results.push(
    "Employee sees preserved six-decision history and demonstrated competency in the matrix",
  );
  const secondRole = (
    await admin.api.api.competenciesControllerCreateCompetencyJobRole({
      code: `SUP_${suffix}`,
      name: `Supervisor de segurança ${suffix}`,
    })
  ).data.data;
  await admin.api.api.competenciesControllerSetCompetencyRequirement({
    jobRoleId: secondRole.id,
    competencyId: competency.id,
    minimumLevel: 3,
    mandatory: true,
    expectedVersion: 0,
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveUntil: null,
    courseId: null,
    learningPathId: null,
  });
  const secondUnit = await groups.create({
    name: `Apoio Huíla — fictício ${suffix}`,
    language: "pt-AO",
  });
  await admin.api.api.groupControllerSetUserGroups([unit.id, secondUnit.id], {
    userId: employee.id,
  });
  await profile(admin.page, employee.id);
  const jobForm = admin.page.getByTestId("competency-job-assignment-form");
  await jobForm.getByLabel("Função profissional", { exact: true }).selectOption(secondRole.id);
  await jobForm.getByLabel("Unidade organizacional", { exact: true }).selectOption(secondUnit.id);
  await jobForm.getByLabel("Gestor responsável", { exact: true }).selectOption(manager.id);
  await jobForm
    .getByLabel("Identificador externo da atribuição RH", { exact: true })
    .fill(`DEMO-${suffix}-2`);
  await save(
    admin.page,
    jobForm,
    "/api/competencies/job-assignments",
    "Acrescentar atribuição profissional",
  );
  await admin.page
    .getByRole("tab", { name: "Matriz de competências da equipa", exact: true })
    .click();
  const combined = admin.page
    .getByTestId("competency-matrix")
    .getByRole("row")
    .filter({ hasText: employee.lastName });
  await expect(combined).toContainText("Proficiência insuficiente");
  await expect(combined).toContainText("Apoio Huíla");
  await admin.page.screenshot({ path: `${output}/16-enterprise-two-jobs.png`, fullPage: true });
  await admin.page.getByRole("tab", { name: "Perfil do colaborador", exact: true }).click();
  const secondaryJob = admin.page
    .getByTestId("competency-job-assignment")
    .filter({ hasText: `Supervisor de segurança ${suffix}` });
  const currentJobs = (
    await admin.api.api.competenciesControllerGetCompetencyWorkspace({ userId: employee.id })
  ).data.data.jobAssignments;
  const secondary = currentJobs.find((x) => x.jobRoleId === secondRole.id && x.state === "active")!;
  await save(
    admin.page,
    secondaryJob,
    `/api/competencies/job-assignments/${secondary.id}/end`,
    "Terminar atribuição",
  );
  await expect(secondaryJob).toContainText("Terminada");
  results.push(
    "Two active jobs combine requirements and organizational units; ending the secondary job preserves its history",
  );
  const final = (await learner.api.api.competenciesControllerGetDevelopmentPlans()).data.data;
  expect(final.plans.find((x) => x.id === plan.id)).toMatchObject({
    state: "completed",
    version: 6,
    responsibleId: manager.id,
  });
  await writeFile(
    `${root}.local/sprint/enterprise-demo.json`,
    JSON.stringify(
      {
        startedAt: new Date(started).toISOString(),
        elapsedMs: Date.now() - started,
        results,
        fixture: { employee, manager, unit, competencyId: competency.id, planId: plan.id },
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: results.length, results, elapsedMs: Date.now() - started }, null, 2),
  );
} catch (error) {
  for (const [index, context] of contexts.entries()) {
    const page = context.pages()[0];
    if (page)
      await page
        .screenshot({ path: `${output}/16-enterprise-failure-${index}.png`, fullPage: true })
        .catch(() => {});
  }
  throw new Error((error as any).response?.data?.message ?? (error as Error).message);
} finally {
  await browser.close();
}
