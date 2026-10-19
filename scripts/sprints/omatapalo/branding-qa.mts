/** Local-only release branding QA. No production credentials or external endpoints. */
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
process.chdir(fileURLToPath(new URL("../../../", import.meta.url)));
const fixture = JSON.parse(await readFile(".local/sprint/integrated-demo.json", "utf8")).fixture;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const startedAt = new Date().toISOString();
const contexts: any[] = [];
async function login(email: string, password: string) {
  const api = new FixtureApiClient("http://localhost:3002");
  api.syncTenantOrigin("http://localhost:5173");
  const response = await api.api.authControllerLogin({ email, password });
  expect(response.status).toBe(201);
  const context = await browser.newContext({
    locale: "pt-AO",
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(context);
  await context.addCookies(
    (response.headers["set-cookie"] ?? []).map((header: string) => {
      const pair = header.split(";")[0],
        index = pair.indexOf("=");
      return {
        name: pair.slice(0, index),
        value: pair.slice(index + 1),
        url: "http://localhost:3002",
      };
    }),
  );
  await api.syncFromContext(context, "http://localhost:5173");
  return { api, context };
}
try {
  const learner = await login(fixture.employee.email, "Password123@");
  const denied = await learner.api.api.settingsControllerUpdateCompanyInformation(
    { certificateIssuer: "Unauthorized issuer" },
    { validateStatus: () => true },
  );
  expect(denied.status).toBe(403);
  const history = (
    await learner.api.api.certificatesControllerGetLearningHistory({
      userId: fixture.employee.id,
      courseId: fixture.courseId,
    })
  ).data.data;
  const certificate = history.certificates.find((x) => x.status === "active");
  if (!certificate) throw new Error("No active synthetic certificate");
  const response = await learner.api.api.certificatesControllerDownloadCertificate(
    { certificateId: certificate.id, language: "pt-AO" },
    { format: "arraybuffer" },
  );
  const bytes = Buffer.from(response.data as any);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  await writeFile(".local/sprint/24-demo-certificate.pdf", bytes, { mode: 0o600 });
  const page = await learner.context.newPage();
  await page.goto(
    `http://localhost:3002/api/certificates/share?certificateId=${certificate.id}&lang=pt-AO`,
  );
  await page.screenshot({
    path: ".local/sprint/screenshots/24-demo-public-certificate.png",
    fullPage: true,
  });
  const ui = await browser.newContext({ locale: "pt-AO" });
  contexts.push(ui);
  const loginPage = await ui.newPage();
  await loginPage.goto("http://localhost:5173/auth/login");
  await expect(loginPage.getByRole("note")).toContainText("Ambiente de Demonstração");
  await loginPage.waitForLoadState("networkidle");
  await expect(loginPage.getByRole("note")).toHaveCount(1);
  await loginPage.screenshot({
    path: ".local/sprint/screenshots/24-demo-login.png",
    fullPage: true,
  });
  await loginPage.setViewportSize({ width: 390, height: 844 });
  await loginPage.waitForLoadState("networkidle");
  await loginPage.screenshot({
    path: ".local/sprint/screenshots/24-demo-login-mobile.png",
    fullPage: true,
  });
  await writeFile(
    ".local/sprint/24-branding-qa.json",
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        certificateId: certificate.id,
        pdfBytes: bytes.length,
        learnerBrandingWrite: denied.status,
        uiNotice: true,
        physicalAndroid: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Branding QA passed: learner PATCH403, actual certificate PDF, desktop/mobile browser demo notice",
  );
} catch (error) {
  // Axios errors contain request headers/cookies; never print the raw object.
  console.error("Branding QA failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
