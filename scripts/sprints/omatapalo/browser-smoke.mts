/** Local-only smoke: no Playwright global setup, database reseed, or customer credentials. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { SETTINGS_PAGE_HANDLES } from "../../../apps/web/e2e/data/settings/handles";
import { COURSE_OVERVIEW_HANDLES } from "../../../apps/web/e2e/data/courses/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";
import { NAVIGATION_HANDLES } from "../../../apps/web/e2e/data/navigation/handles";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = process.env.SPRINT_QA_OUTPUT ?? `${root}.local/sprint/screenshots`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  locale: "pt-AO",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(60_000);
const results: string[] = [];
await mkdir(output, { recursive: true });
try {
  await page.goto("http://localhost:5173/auth/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  await page.screenshot({ path: `${output}/01-login-pt-AO.png`, fullPage: true });
  results.push("Visitor browser pt-AO: localized login and HTML lang");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page.getByTestId(NAVIGATION_HANDLES.COURSES_LINK)).toBeVisible();
  results.push("Synthetic administrator authentication");
  await page.goto("http://localhost:5173/dashboard");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  await expect(page.getByTestId(NAVIGATION_HANDLES.COURSES_LINK)).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main .animate-spin")).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator("main h2, main h3").first()).toBeVisible();
  await page.screenshot({ path: `${output}/02-dashboard-desktop.png`, fullPage: true });
  results.push("Dashboard loaded with authenticated pt-AO session");
  await page.goto("http://localhost:5173/settings");
  await page.getByTestId(SETTINGS_PAGE_HANDLES.LANGUAGE_SELECT).click();
  await page.getByRole("option", { name: /^(English|Inglês)$/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByTestId(SETTINGS_PAGE_HANDLES.LANGUAGE_SELECT).click();
  const savedLanguage = page.waitForResponse(
    (response: { url(): string; request(): { method(): string } }) =>
      response.url().endsWith("/api/settings") && response.request().method() === "PUT",
  );
  await page.getByRole("option", { name: /Portugu.*Angola/ }).click();
  expect((await savedLanguage).ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  await expect(page.getByTestId(SETTINGS_PAGE_HANDLES.LANGUAGE_SELECT)).toContainText(
    "Português (Angola)",
  );
  await page.screenshot({
    path: `${output}/02-settings-pt-AO.png`,
    fullPage: true,
    mask: [page.getByTestId(SETTINGS_PAGE_HANDLES.USER_DETAILS_CONTACT_PHONE)],
  });
  results.push("Visible language selector: save to API, reload, restore pt-AO");
  await page.getByTestId(NAVIGATION_HANDLES.COURSES_LINK).click();
  await expect(page).toHaveURL(/\/courses(?:\?|$)/);
  await expect(page.getByTestId(NAVIGATION_HANDLES.COURSES_LINK)).toContainText("Formações");
  await expect(page.getByTestId("modern-course-card-link").first()).toBeVisible();
  await page.screenshot({ path: `${output}/03-catalog-pt-AO.png`, fullPage: true });
  results.push("Course catalogue loaded in pt-AO");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/03-catalog-mobile.png`, fullPage: true });
  const mobileWidth = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(mobileWidth.document).toBeLessThanOrEqual(mobileWidth.viewport + 1);
  results.push(
    `Mobile catalogue horizontal overflow: ${Math.max(0, mobileWidth.document - mobileWidth.viewport)}px`,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByTestId("modern-course-card-link").first().click();
  await expect(page.getByTestId(COURSE_OVERVIEW_HANDLES.HERO_TITLE)).toBeVisible();
  await page.getByTestId("Elevate Your Writing: Advanced Clause Strategies").click();
  await page.getByTestId("lesson-title").first().click();
  await expect(page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  await page.screenshot({ path: `${output}/04-lesson-pt-AO.png`, fullPage: true });
  results.push(
    "Native course and lesson opened with pt-AO interface (synthetic English course content)",
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  await writeFile(
    `${root}.local/sprint/browser-dom.txt`,
    await page
      .locator("body")
      .innerText()
      .catch(() => "Unavailable"),
  );
  throw error;
} finally {
  await writeFile(
    `${root}.local/sprint/browser-smoke.json`,
    JSON.stringify({ results, url: page.url() }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
