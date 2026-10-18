/** Genuine local Chrome workflow: independent SCORM -> renewal -> retained history -> explicit revocation. */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const demo = JSON.parse(await readFile(`${root}.local/sprint/scorm-demo.json`, "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "pt-AO",
  timezoneId: "Africa/Luanda",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const api = new FixtureApiClient("http://localhost:3000");
const started = Date.now();
const results: string[] = [];
const history = async () =>
  (
    await api.api.certificatesControllerGetLearningHistory({
      userId: demo.userId,
      courseId: demo.courseId,
    })
  ).data.data;
try {
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, "http://localhost:5173");
  const original = await history();
  expect(original.currentLearningCycle).toBe(1);
  const oldAttempt = original.scormAttempts[0].id;
  const oldCertificate = original.certificates[0].id;
  await api.api.certificatesControllerResetCourseCertificates(demo.courseId, {
    scope: "users",
    userIds: [demo.userId],
    sendEmail: false,
  });
  const renewed = await history();
  expect(renewed.currentLearningCycle).toBe(2);
  expect(renewed.scormAttempts[0].id).toBe(oldAttempt);
  expect(renewed.certificates[0]).toMatchObject({ id: oldCertificate, status: "archived" });
  results.push(
    "Native renewal opens cycle 2 and retains the original certificate, attempt ID and score",
  );
  const course = (await api.api.courseControllerGetCourse({ id: demo.courseId, language: "pt-AO" }))
    .data.data;
  const lessonId = course.chapters[0].lessons[0].id;
  await page.goto(`http://localhost:5173/course/${demo.courseId}/lesson/${lessonId}`);
  page.on("dialog", async (dialog: any) =>
    dialog.type() === "confirm" ? dialog.accept() : dialog.dismiss(),
  );
  const frame = () => page.getByTestId(LEARNING_HANDLES.SCORM_IFRAME).contentFrame();
  const content = () => frame().frameLocator("#contentFrame");
  await expect(content().locator("h1")).toContainText("Play of the game");
  for (let i = 0; i < 14; i++) await frame().locator("#butNext").click();
  await expect(content().getByRole("heading", { name: "Knowledge Check" })).toBeVisible();
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
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().includes("/scorm/runtime/finish") && r.status() === 201,
    ),
    frame().locator("#butExit").click(),
  ]);
  await expect.poll(async () => (await history()).certificates.length).toBe(2);
  const completed = await history();
  expect(completed.scormAttempts).toHaveLength(2);
  expect(completed.scormAttempts.map((a) => Number(a.scoreRaw))).toEqual([100, 100]);
  results.push(
    "Independent package completes a fresh cycle through the player; a second certificate is issued automatically",
  );
  const current = completed.certificates.find((c) => c.status === "active")!;
  const shared = (
    await api.api.certificatesControllerCreateCertificateShareLink({
      certificateId: current.id,
      language: "pt-AO",
    })
  ).data;
  const publicPage = await browser.newPage();
  const publicResponse = await publicPage.goto(shared.shareUrl);
  expect(publicResponse?.status()).toBe(200);
  expect(publicResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(publicPage.locator("html")).toHaveAttribute("lang", "pt-AO");
  await publicPage.screenshot({
    path: `${root}.local/sprint/screenshots/18-public-certificate.png`,
    fullPage: true,
  });
  results.push(
    "Anonymous public share URL works on its canonical tenant origin, localized and without stale public cache",
  );
  const url = `http://localhost:5173/learning-history/${demo.courseId}/${demo.userId}`;
  await page.goto(url);
  await expect(page.getByTestId("learning-cycle-1")).toContainText("Renovado");
  await expect(page.getByTestId("learning-cycle-2")).toContainText("Válido");
  await expect(page.getByTestId("learning-cycle-2")).not.toContainText("Emitido em: —");
  await page.screenshot({
    path: `${root}.local/sprint/screenshots/18-certificate-history.png`,
    fullPage: true,
  });
  await page
    .getByLabel("Motivo da revogação", { exact: true })
    .fill("Certificado de demonstração revogado após revisão fundamentada da emissão.");
  await page.getByRole("checkbox").check();
  await Promise.all([
    page.waitForResponse(
      (r: any) => r.url().endsWith(`/certificates/${current.id}/revoke`) && r.status() === 201,
    ),
    page.getByRole("button", { name: "Revogar certificado", exact: true }).click(),
  ]);
  await expect(page.getByTestId("learning-cycle-2")).toContainText("Revogado");
  expect((await publicPage.goto(shared.shareUrl))?.status()).toBe(404);
  const saved = await history();
  expect(saved.scormAttempts.map((a) => a.id)).toEqual(completed.scormAttempts.map((a) => a.id));
  expect(saved.currentLearningCycle).toBe(2);
  await page.screenshot({
    path: `${root}.local/sprint/screenshots/18-revoked-certificate-history.png`,
    fullPage: true,
  });
  results.push(
    "Admin revokes through the UI; anonymous verification immediately returns 404; both attempts and cycles remain intact",
  );
  const report = {
    results,
    elapsedMs: Date.now() - started,
    courseId: demo.courseId,
    historyUrl: url,
    actor: "synthetic admin in native learner mode",
    independentPackage: "Rustici SCORM 1.2, CC BY 3.0 US",
  };
  await writeFile(
    `${root}.local/sprint/browser-certificate-history.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  await publicPage.close();
} catch (error) {
  await page.screenshot({
    path: `${root}.local/sprint/screenshots/18-certificate-history-failure.png`,
    fullPage: true,
  });
  throw new Error(error instanceof Error ? error.message : String(error));
} finally {
  await context.close();
  await browser.close();
}
