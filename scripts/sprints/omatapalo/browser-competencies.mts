/** Real UI and local API; creates an explicitly fictional reusable competency demonstration. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { GroupFactory } from "../../../apps/web/e2e/factories/group.factory";
import { UserFactory } from "../../../apps/web/e2e/factories/user.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = process.env.SPRINT_QA_OUTPUT ?? `${root}.local/sprint/screenshots`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "pt-AO",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const api = new FixtureApiClient("http://localhost:3000");
const groups = new GroupFactory(api);
const users = new UserFactory(api);
const results: string[] = [];
const startedAt = Date.now();
try {
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, "http://localhost:5173");
  const employees = [];
  for (const province of ["Luanda", "Huíla", "Benguela"]) {
    const group =
      (await groups.findByName(`Utu Demo — ${province}`)) ??
      (await groups.create({ name: `Utu Demo — ${province}`, language: "pt-AO" }));
    const email = `utu-demo-${province
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()}@example.com`;
    const employee =
      (await users.getByEmail(email)) ??
      (await users.create({
        email,
        firstName: `Colaborador ${province}`,
        lastName: "Fictício",
        language: "pt-AO",
      }));
    await api.api.groupControllerSetUserGroups([group.id], { userId: employee.id });
    employees.push({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      unitId: group.id,
      province,
    });
  }
  await page.goto("http://localhost:5173/competencies");
  await expect(page.getByTestId("competencies-workspace")).toBeVisible();
  let workspace = (
    await api.api.competenciesControllerGetCompetencyWorkspace({ language: "pt-AO" })
  ).data.data;
  let competency = workspace.catalog.find((x) => x.code === "UTU_EPI");
  if (!competency) {
    await page.getByRole("tab", { name: "Catálogo de competências" }).click();
    const form = page.getByTestId("competency-catalog-form");
    await form.getByLabel("Código", { exact: true }).fill("UTU_EPI");
    await form
      .getByLabel("Nome", { exact: true })
      .fill("Utilização segura de EPI — demonstração fictícia");
    await form.getByLabel("Categoria", { exact: true }).fill("Segurança no trabalho");
    await form
      .getByLabel("Descrição", { exact: true })
      .fill("Competência avaliada por observação presencial, com evidência fictícia.");
    await form.getByLabel(/Designações dos níveis/).fill("Iniciado\nAutónomo\nFormador");
    const saved = page.waitForResponse(
      (r: any) => r.url().endsWith("/api/competencies/catalog") && r.status() === 201,
    );
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
    await saved;
    workspace = (await api.api.competenciesControllerGetCompetencyWorkspace({ language: "pt-AO" }))
      .data.data;
    competency = workspace.catalog.find((x) => x.code === "UTU_EPI");
  }
  expect(competency?.levels).toHaveLength(3);
  results.push("Catalog and defined levels created through the real UI");
  let role = workspace.roles.find((x) => x.code === "UTU_OPERATOR");
  await page.getByRole("tab", { name: "Funções e requisitos" }).click();
  const roleForm = page.getByTestId("competency-role-form");
  await roleForm.getByRole("button", { name: "Guardar", exact: true }).click();
  expect(
    await roleForm
      .getByLabel("Código", { exact: true })
      .evaluate((element: HTMLInputElement) => element.validationMessage),
  ).toBe("Reveja os campos obrigatórios e introduza valores válidos.");
  results.push("Native form validation is localized in pt-AO");
  if (!role) {
    const form = page.getByTestId("competency-role-form");
    await form.getByLabel("Código", { exact: true }).fill("UTU_OPERATOR");
    await form.getByLabel("Nome", { exact: true }).fill("Operador de obra — fictício");
    const saved = page.waitForResponse(
      (r: any) => r.url().endsWith("/api/competencies/roles") && r.status() === 201,
    );
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
    await saved;
    workspace = (await api.api.competenciesControllerGetCompetencyWorkspace({ language: "pt-AO" }))
      .data.data;
    role = workspace.roles.find((x) => x.code === "UTU_OPERATOR");
  }
  const requirement = page.getByTestId("competency-requirement-form");
  await requirement.getByLabel("Função profissional", { exact: true }).selectOption(role!.id);
  await requirement.getByLabel("Competência", { exact: true }).selectOption(competency!.id);
  await requirement.getByLabel("Nível exigido", { exact: true }).fill("2");
  const recommendation = workspace.learning.courses[0];
  if (recommendation)
    await requirement
      .getByLabel("Formação recomendada", { exact: true })
      .selectOption(recommendation.id);
  let saved = page.waitForResponse(
    (r: any) => r.url().endsWith("/api/competencies/requirements") && r.status() === 200,
  );
  await requirement.getByRole("button", { name: "Guardar", exact: true }).click();
  await saved;
  for (const employee of employees) {
    const form = page.getByTestId("competency-assignment-form");
    await form.getByLabel("Colaborador", { exact: true }).selectOption(employee.id);
    await form.getByLabel("Função profissional", { exact: true }).selectOption(role!.id);
    await form.getByLabel("Unidade organizacional", { exact: true }).selectOption(employee.unitId);
    saved = page.waitForResponse(
      (r: any) => r.url().endsWith("/api/competencies/assignments") && r.status() === 200,
    );
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
    await saved;
    await expect(form.locator('select[name="userId"]')).toHaveValue("");
  }
  results.push(
    "Role requirements, recommendations and assignments saved for Luanda, Huíla and Benguela",
  );
  await page.getByRole("tab", { name: "Perfil do colaborador" }).click();
  await page.getByLabel("Colaborador", { exact: true }).selectOption(employees[0]!.id);
  const form = page.getByTestId("competency-evidence-form");
  for (const level of [1, 2]) {
    await form.getByLabel("Competência", { exact: true }).selectOption(competency!.id);
    await form.getByLabel("Nível de proficiência", { exact: true }).fill(String(level));
    await form.locator('select[name="status"]').selectOption("approved");
    await form
      .getByLabel("Origem da evidência", { exact: true })
      .fill("Observação presencial — demonstração");
    await form
      .getByLabel("Evidência e fundamentação da avaliação", { exact: true })
      .fill(
        `Observação fictícia em Luanda: nível ${level}, sem certificação automática por questionário.`,
      );
    saved = page.waitForResponse(
      (r: any) => r.url().endsWith("/api/competencies/evidence") && r.status() === 201,
    );
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
    await saved;
    await expect(form.getByLabel("Origem da evidência", { exact: true })).toHaveValue("");
  }
  await expect(page.getByTestId("competency-evidence").first()).toBeVisible();
  await expect(page.getByTestId("competency-evidence")).toHaveCount(
    (await api.api.competenciesControllerGetCompetencyWorkspace({ userId: employees[0]!.id })).data
      .data.evidence.length,
  );
  await page.screenshot({ path: `${output}/08-competency-evidence.png`, fullPage: true });
  results.push("Professional assessment recorded in UI; previous evidence preserved");
  await page.getByRole("tab", { name: "Matriz de competências da equipa" }).click();
  const matrix = page.getByTestId("competency-matrix");
  await expect(matrix.getByRole("row").filter({ hasText: employees[0]!.name })).toContainText(
    "Requisito cumprido",
  );
  await expect(matrix.getByRole("row").filter({ hasText: employees[1]!.name })).toContainText(
    "Competência em falta",
  );
  await expect(matrix.getByRole("row").filter({ hasText: employees[2]!.name })).toContainText(
    "Competência em falta",
  );
  await page.screenshot({ path: `${output}/08-competency-matrix.png`, fullPage: true });
  results.push("Matrix distinguishes demonstrated competency from missing competencies");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/08-competency-mobile.png`, fullPage: true });
  await writeFile(
    `${root}.local/sprint/competency-demo.json`,
    JSON.stringify(
      { competencyId: competency!.id, jobRoleId: role!.id, employees, results },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: results.length, results, elapsedMs: Date.now() - startedAt }, null, 2),
  );
} catch (error) {
  await page
    .screenshot({ path: `${output}/08-competency-failure.png`, fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
