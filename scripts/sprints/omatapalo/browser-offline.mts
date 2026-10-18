/** Local API, DB, private object storage and Chrome. Only failed transfer is intercepted. */
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
const profile = `${root}.local/sprint/offline-profile-${Date.now()}`;
const results: string[] = [];
const record = (message: string) => {
  results.push(message);
  console.log(message);
};
const output = process.env.SPRINT_QA_OUTPUT ?? `${root}.local/sprint/screenshots`;
await mkdir(output, { recursive: true });
const launch = () =>
  chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: true,
    locale: "pt-AO",
    viewport: { width: 1200, height: 1000 },
  });
let context = await launch();
let page = await context.newPage();
page.setDefaultTimeout(60_000);
const api = new FixtureApiClient("http://localhost:3000");
const courses = new CourseFactory(api);
const curriculum = new CurriculumFactory(api);
const categories = new CategoryFactory(api);
let courseId: string | undefined;
let categoryId: string | undefined;
function syntheticPdf() {
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  const stream = "BT /F1 18 Tf 50 750 Td (Seguranca no trabalho - Huíla) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(parts.join(""), "latin1"));
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const start = Buffer.byteLength(parts.join(""), "latin1");
  parts.push(
    `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
      .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`,
  );
  return new File([Buffer.from(parts.join(""), "latin1")], "safety-synthetic.pdf", {
    type: "application/pdf",
  });
}
try {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(context, baseURL);
  categoryId = (
    await categories.create({ title: `Omatapalo fictícia ${Date.now()}`, language: "pt-AO" })
  ).id;
  const course = await courses.create({
    title: "Segurança — operações fictícias em Luanda, Huíla e Benguela",
    categoryId,
    language: "pt-AO",
  });
  courseId = course.id;
  const chapter = await curriculum.createChapter({ courseId, title: "Prevenção de acidentes" });
  const text =
    "<h2>Segurança em todas as províncias</h2><p>O colaborador utiliza capacete e verifica o equipamento antes de iniciar a actividade.</p>";
  const lesson = await curriculum.createContentLesson(courseId, {
    chapterId: chapter.id,
    title: "Equipamento de protecção individual",
    description: text,
  });
  const uploaded = await api.api.lessonControllerUploadFileToLesson({
    lessonId: lesson.id,
    language: "pt-AO",
    title: "Manual de segurança sintético",
    description: "PDF fictício para validação offline",
    visibility: "private",
    file: syntheticPdf(),
  });
  const resourceId = uploaded.data.data.resourceId;
  await curriculum.updateContentLesson(lesson.id, {
    language: "pt-AO",
    description: `${text}<div data-node-type="pdf-preview" data-src="http://localhost:3000/api/lesson/lesson-resource/${resourceId}" data-resource-id="${resourceId}"></div>`,
  });
  await courses.update(courseId, { language: "pt-AO", status: "published" });
  const anonymous = new FixtureApiClient("http://localhost:3000");
  anonymous.syncTenantOrigin(baseURL);
  const denied = await anonymous.api.lessonControllerGetLessonResource(resourceId, undefined, {
    validateStatus: () => true,
  });
  expect([401, 403, 404]).toContain(denied.status);
  record("Private PDF denied to anonymous session");
  await courses.setStudentMode(courseId, true);
  const loaded = await api.api.lessonControllerGetLessonById(lesson.id, { language: "pt-AO" });
  expect(
    loaded.data.data.lessonResources?.some(
      (resource) => resource.contentType === "application/pdf",
    ),
  ).toBe(true);
  await page.goto(`${baseURL}/course/${courseId}`);
  await context.route(
    "**/api/lesson/lesson-resource/**",
    (route: { abort(reason: string): Promise<void> }) => route.abort("internetdisconnected"),
  );
  await page.getByTestId("offline-download").click();
  await expect(page.getByRole("status").filter({ hasText: "A descarga falhou" })).toBeVisible();
  await context.unroute("**/api/lesson/lesson-resource/**");
  record("Interrupted transfer rejected; retry uses real resource response");
  // Chromium storage enforcement, not a mocked successful download or a fake estimate.
  const storageSession = await context.newCDPSession(page);
  await storageSession.send("Storage.overrideQuotaForOrigin", { origin: baseURL, quotaSize: 1 });
  const estimatedQuota = await page.evaluate(() => navigator.storage.estimate());
  const protocolQuota = await storageSession.send("Storage.getUsageAndQuota", { origin: baseURL });
  console.log("QUOTA_PROBE", JSON.stringify({ estimatedQuota, protocolQuota }));
  try {
    if (estimatedQuota.quota === 1) {
      await page.getByTestId("offline-download").click();
      await expect(
        page.getByRole("status").filter({ hasText: /A descarga falhou|espaço/i }),
      ).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: "Disponível offline" })).toHaveCount(
        0,
      );
      record("Chromium low-quota download rejection observed");
    } else {
      record(
        "BLOCKED quota probe: CDP reports quota=1 but navigator.storage.estimate exposes a different quota; physical storage-full validation remains open",
      );
    }
  } finally {
    await storageSession.send("Storage.overrideQuotaForOrigin", { origin: baseURL });
    await storageSession.detach();
  }
  await page.getByTestId("offline-download").click();
  await expect(page.getByRole("status").filter({ hasText: "Disponível offline" })).toBeVisible();
  await context.route(
    "**/api/lesson/lesson-resource/**",
    (route: { abort(reason: string): Promise<void> }) => route.abort("internetdisconnected"),
  );
  await page.getByTestId("offline-download").click();
  await expect(page.getByRole("status").filter({ hasText: "A descarga falhou" })).toBeVisible();
  await context.unroute("**/api/lesson/lesson-resource/**");
  record("Interrupted refresh keeps the previous complete download available");
  await page.getByRole("link", { name: "Descargas offline" }).click();
  await expect(page.getByTestId("offline-reader")).toContainText(
    "Segurança em todas as províncias",
  );
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  record("Authenticated download rendered real text and PDF");
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker not ready")), 30000),
      ),
    ]);
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
  });
  await context.close();
  context = await launch();
  await context.setOffline(true);
  page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const requests: string[] = [];
  page.on("request", (request: { url(): string }) => requests.push(request.url()));
  page.on("pageerror", (error: Error) => console.log("Offline browser error:", error.message));
  await page.goto(`${baseURL}/offline-learning`);
  await expect(page.getByTestId("offline-reader")).toContainText("Sem ligação à Internet", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("offline-reader")).toContainText(
    "Segurança em todas as províncias",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("offline-reader")).toContainText("Página 1 de 1");
  await expect(page.getByTestId("offline-reader")).toContainText("0,00 MB");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-AO");
  expect(
    requests.filter((url) => {
      const resource = new URL(url);
      return (
        (resource.pathname.startsWith("/api/") &&
          resource.pathname !== "/api/settings/manifest.webmanifest") ||
        /unpkg\.com|59100/.test(resource.host)
      );
    }),
  ).toEqual([]);
  record(
    "Closed/reopened offline: shell, text and PDF canvas restored; no authenticated API/private storage/PDF CDN calls",
  );
  await page.screenshot({
    path: `${output}/05-offline-text-pdf.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: `${output}/05-offline-pdf-mobile.png`, fullPage: true });
  const mobileWidth = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(mobileWidth.document).toBeLessThanOrEqual(mobileWidth.viewport + 1);
  record(
    `Offline PDF mobile horizontal overflow: ${Math.max(0, mobileWidth.document - mobileWidth.viewport)}px`,
  );
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.getByTestId("offline-remove").click();
  await expect(page.getByTestId("offline-reader")).toContainText(
    "Não existem formações descarregadas",
  );
  await page.reload();
  await expect(page.getByTestId("offline-reader")).not.toContainText(
    "Segurança em todas as províncias",
  );
  record("Explicit removal persists after offline reload");
} catch (error) {
  await page.screenshot({ path: `${output}/offline-failure.png`, fullPage: true }).catch(() => {});
  await writeFile(
    `${root}.local/sprint/offline-failure-dom.txt`,
    await page
      .locator("body")
      .innerText()
      .catch(() => "Unavailable"),
  );
  throw new Error(error instanceof Error ? error.message : String(error));
} finally {
  await context.close();
  if (courseId)
    await courses.delete(courseId).catch(() => record("Cleanup pending: synthetic course"));
  if (categoryId)
    await categories.delete(categoryId).catch(() => record("Cleanup pending: synthetic category"));
  await writeFile(
    `${root}.local/sprint/browser-offline.json`,
    JSON.stringify({ results, courseId, categoryId }, null, 2),
  );
}
console.log(JSON.stringify({ results }, null, 2));
