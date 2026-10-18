/** Read-only Chrome QA of the retained fictional personas. No fixture mutation or mocked API success. */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const demo = JSON.parse(await readFile(`${root}.local/sprint/commercial-demo.json`, "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const startedAt = new Date().toISOString(),
  started = Date.now();
const results: string[] = [];
try {
  for (const role of ["learner", "operationalManager", "trainingManager", "administrator"]) {
    const context = await browser.newContext({
      locale: "pt-AO",
      timezoneId: "Africa/Luanda",
      viewport: { width: 1440, height: 1000 },
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      await page.goto("http://localhost:5173/auth/login");
      await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill(demo.personas[role]);
      await page
        .getByTestId(LOGIN_PAGE_HANDLES.PASSWORD)
        .fill(role === "administrator" ? "password" : "Password123@");
      await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
      await expect(page).not.toHaveURL(/auth\/login/);
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
      let capture = "learner";
      if (role === "administrator") {
        await page.goto("http://localhost:5173/reports");
        const metrics = page.getByRole("region", { name: "Indicadores de síntese", exact: true });
        await expect(metrics.locator("article")).toHaveCount(4);
        await expect(metrics).toContainText("Formandos");
        await expect(metrics).toContainText("Formações");
        capture = "executive-reports";
        results.push(
          "Administrator report has four loaded native metrics, not loading placeholders",
        );
      } else if (role === "operationalManager") {
        await page.goto("http://localhost:5173/competencies");
        await expect(page.getByTestId("competencies-workspace")).toBeVisible();
        await expect(
          page.getByRole("cell", { name: /Colaborador Luanda Fictício/ }).first(),
        ).toBeVisible();
        capture = "manager";
        results.push("Operational manager sees the retained authorised team matrix");
      } else {
        await page.goto(demo.courseUrl);
        await expect(
          page.getByRole("heading", { name: /Segurança no Trabalho/ }).first(),
        ).toBeVisible();
        if (role === "trainingManager") capture = "training-manager";
        results.push(`${role}: retained Safety course opens in the native authorised experience`);
      }
      await page.screenshot({
        path: `${root}.local/sprint/screenshots/18-commercial-${capture}.png`,
        fullPage: true,
      });
      if (role === "learner") {
        const completion = JSON.parse(
          await readFile(`${root}.local/sprint/commercial-completion.json`, "utf8"),
        );
        await page.goto(
          `http://localhost:5173/learning-history/${demo.courseId}/${completion.userId}`,
        );
        await expect(page.getByTestId("learning-cycle-1")).toContainText("Válido");
        await expect(page.getByTestId("learning-cycle-1")).toContainText("100 %");
        await page.screenshot({
          path: `${root}.local/sprint/screenshots/18-commercial-active-certificate.png`,
          fullPage: true,
        });
        results.push("Learner history has the active certificate and localized native score");
      }
    } finally {
      await context.close();
    }
  }
  const completion = JSON.parse(
    await readFile(`${root}.local/sprint/commercial-completion.json`, "utf8"),
  );
  const publicPage = await browser.newPage();
  const publicResponse = await publicPage.goto(completion.shareUrl);
  expect(publicResponse?.status()).toBe(200);
  expect(publicResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(
    publicPage.getByRole("link", { name: "Abrir a plataforma", exact: true }),
  ).toBeVisible();
  await expect(publicPage).toHaveTitle(/Certificado de formação/);
  await publicPage.screenshot({
    path: `${root}.local/sprint/screenshots/18-commercial-public-certificate.png`,
    fullPage: true,
  });
  results.push(
    "Anonymous certificate verification and metadata use pt-AO without stale public caching",
  );
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    results,
  };
  await writeFile(`${root}.local/sprint/commercial-review.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
