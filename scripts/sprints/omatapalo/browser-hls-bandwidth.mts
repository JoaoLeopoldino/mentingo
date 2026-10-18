/** Measure the real native lesson player against a local synthetic HLS origin. No LMS response mocks. */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FixtureApiClient } from "../../../apps/web/e2e/utils/api-client";
import { CourseFactory } from "../../../apps/web/e2e/factories/course.factory";
import { CurriculumFactory } from "../../../apps/web/e2e/factories/curriculum.factory";
import { CategoryFactory } from "../../../apps/web/e2e/factories/category.factory";
import { LOGIN_PAGE_HANDLES } from "../../../apps/web/e2e/data/auth/handles";
import { LEARNING_HANDLES } from "../../../apps/web/e2e/data/learning/handles";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = JSON.parse(await readFile(`${root}.local/sprint/hls-fixture.json`, "utf8"));
if (!fixture.directory.startsWith(path.join(root, ".local/sprint/hls-")))
  throw new Error("Unrecognised fixture directory");
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url!, "http://localhost").pathname;
  if (
    !["GET", "HEAD"].includes(request.method!) ||
    !/^\/(master\.m3u8|(?:144|240|360|720)\/(?:index\.m3u8|segment-\d{3}\.ts))$/.test(pathname)
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const bytes = await readFile(path.join(fixture.directory, pathname.slice(1)));
    response.writeHead(200, {
      "content-type": pathname.endsWith(".ts") ? "video/mp2t" : "application/vnd.apple.mpegurl",
      "content-length": bytes.length,
      "access-control-allow-origin": "http://localhost:5173",
      "cache-control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const mediaOrigin = `http://127.0.0.1:${(server.address() as any).port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const setup = await browser.newContext({ serviceWorkers: "block", locale: "pt-AO" });
const api = new FixtureApiClient("http://localhost:3000");
const courses = new CourseFactory(api),
  categories = new CategoryFactory(api),
  curriculum = new CurriculumFactory(api);
const startedAt = new Date().toISOString(),
  started = Date.now();
let courseId: string | undefined, categoryId: string | undefined;
const reports: any[] = [];
try {
  const page = await setup.newPage();
  await page.goto("http://localhost:5173/auth/login");
  await page.getByTestId(LOGIN_PAGE_HANDLES.EMAIL).fill("admin+localhost@example.com");
  await page.getByTestId(LOGIN_PAGE_HANDLES.PASSWORD).fill("password");
  await page.getByTestId(LOGIN_PAGE_HANDLES.LOGIN).click();
  await expect(page).not.toHaveURL(/auth\/login/);
  await api.syncFromContext(setup, "http://localhost:5173");
  categoryId = (
    await categories.create({ title: `Vídeo sintético ${Date.now()}`, language: "pt-AO" })
  ).id;
  const course = await courses.create({
    title: "Validação HLS — padrão sintético sem áudio",
    categoryId,
    language: "pt-AO",
  });
  courseId = course.id;
  const chapter = await curriculum.createChapter({ courseId, title: "Rede limitada" });
  const lesson = await curriculum.createContentLesson(courseId, {
    chapterId: chapter.id,
    title: "Padrão de movimento HLS",
    description: `<p>Conteúdo sintético local para medir o leitor, sem dados do cliente ou CDN externa.</p><div data-node-type="video" data-source-type="external" data-provider="unknown" data-src="${mediaOrigin}/master.m3u8"></div>`,
  });
  await courses.update(courseId, { status: "published", language: "pt-AO" });
  await courses.setStudentMode(courseId, true);
  const storageState = await setup.storageState();
  const profiles = [
    { name: "normal", kbps: 5000, latencyMs: 20, windowMs: 15000, outage: false },
    { name: "limited-500", kbps: 500, latencyMs: 200, windowMs: 35000, outage: false },
    { name: "limited-150", kbps: 150, latencyMs: 400, windowMs: 45000, outage: false },
    { name: "interrupted-500", kbps: 500, latencyMs: 200, windowMs: 40000, outage: true },
  ].filter(
    (profile) =>
      !process.env.SPRINT_VIDEO_PROFILES ||
      process.env.SPRINT_VIDEO_PROFILES.split(",").includes(profile.name),
  );
  if (!profiles.length) throw new Error("No measurement profiles selected");
  for (const profile of profiles) {
    const context = await browser.newContext({
      storageState,
      locale: "pt-AO",
      serviceWorkers: "block",
      viewport: { width: 1280, height: 900 },
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      await page.goto(`http://localhost:5173/course/${courseId}/lesson/${lesson.id}`);
      await expect(page.getByTestId(LEARNING_HANDLES.LESSON_TITLE)).toHaveText(
        "Padrão de movimento HLS",
      );
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      const requests = new Map<string, any>();
      cdp.on("Network.requestWillBeSent", (event: any) => {
        if (event.request.url.startsWith(mediaOrigin + "/"))
          requests.set(event.requestId, {
            path: new URL(event.request.url).pathname,
            start: event.timestamp,
            chunkBytes: 0,
          });
      });
      cdp.on("Network.responseReceived", (event: any) => {
        const item = requests.get(event.requestId);
        if (item) {
          item.status = event.response.status;
          item.fromCache = event.response.fromDiskCache;
        }
      });
      cdp.on("Network.dataReceived", (event: any) => {
        const item = requests.get(event.requestId);
        if (item) item.chunkBytes += event.encodedDataLength;
      });
      cdp.on("Network.loadingFinished", (event: any) => {
        const item = requests.get(event.requestId);
        if (item) {
          item.bytes = event.encodedDataLength;
          item.elapsedMs = (event.timestamp - item.start) * 1000;
        }
      });
      cdp.on("Network.loadingFailed", (event: any) => {
        const item = requests.get(event.requestId);
        if (item) item.error = event.errorText;
      });
      const network = {
        offline: false,
        latency: profile.latencyMs,
        downloadThroughput: (profile.kbps * 1000) / 8,
        uploadThroughput: (profile.kbps * 1000) / 8,
      };
      await cdp.send("Network.emulateNetworkConditions", network);
      await page.evaluate(() => {
        const metrics: any = { started: performance.now(), events: [], samples: [] };
        (window as any).__sprintVideoMetrics = metrics;
        const observer = new MutationObserver(() => {
          const video = document.querySelector("video");
          if (!video || (video as any).__measured) return;
          (video as any).__measured = true;
          video.muted = true;
          for (const name of ["playing", "waiting", "stalled", "error", "ended", "resize"])
            video.addEventListener(name, () =>
              metrics.events.push({
                name,
                elapsedMs: performance.now() - metrics.started,
                time: video.currentTime,
                height: video.videoHeight,
                errorCode: video.error?.code ?? null,
              }),
            );
          metrics.timer = setInterval(
            () =>
              metrics.samples.push({
                elapsedMs: performance.now() - metrics.started,
                time: video.currentTime,
                height: video.videoHeight,
                readyState: video.readyState,
                paused: video.paused,
              }),
            500,
          );
        });
        observer.observe(document.body, { childList: true, subtree: true });
        metrics.observer = observer;
      });
      console.log(`START ${profile.name}: ${profile.kbps} kbit/s, ${profile.latencyMs} ms latency`);
      await page.locator('.video-node [role="button"]').first().click();
      let interruption: any = null;
      if (profile.outage) {
        await page.waitForFunction(
          () => (document.querySelector("video")?.currentTime ?? 0) >= 4,
          undefined,
          { timeout: 30000 },
        );
        await cdp.send("Network.emulateNetworkConditions", { ...network, offline: true });
        await page.waitForTimeout(6000);
        await cdp.send("Network.emulateNetworkConditions", network);
        interruption = await page.evaluate(() => ({
          restoredAtMs: performance.now() - (window as any).__sprintVideoMetrics.started,
          positionAtRestore: document.querySelector("video")?.currentTime ?? 0,
          recovery: "automatic-or-pending",
        }));
        await page.waitForTimeout(9000);
        const retry = page.getByRole("button", { name: "Voltar a tentar reproduzir", exact: true });
        if (await retry.isVisible()) {
          const recoveryControl = await retry.evaluate((element: HTMLElement) => ({
            height: element.getBoundingClientRect().height,
            fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          }));
          expect(recoveryControl.height).toBeGreaterThanOrEqual(44);
          expect(recoveryControl.fontSize).toBeGreaterThanOrEqual(14);
          Object.assign(interruption, { recoveryControl });
          await page.screenshot({
            path: `${root}.local/sprint/screenshots/21-hls-recovery-offer.png`,
            fullPage: true,
          });
          Object.assign(
            interruption,
            await page.evaluate(() => ({
              retryAtMs: performance.now() - (window as any).__sprintVideoMetrics.started,
              positionBeforeRetry: document.querySelector("video")?.currentTime ?? 0,
            })),
            { recovery: "explicit-native-ui-retry" },
          );
          await retry.click();
        }
        await page.waitForTimeout(12000);
      } else await page.waitForTimeout(profile.windowMs);
      const measured = await page.evaluate(() => {
        const metrics = (window as any).__sprintVideoMetrics;
        clearInterval(metrics.timer);
        metrics.observer.disconnect();
        const player = (document.querySelector(".video-js") as any)?.player;
        const video = document.querySelector("video");
        const vhs = player?.tech({ IWillNotUseThisInPlugins: true })?.vhs;
        return {
          events: metrics.events,
          samples: metrics.samples,
          elapsedMs: performance.now() - metrics.started,
          currentTime: video?.currentTime ?? 0,
          errorCode: video?.error?.code ?? null,
          renditions:
            vhs?.representations?.().map((r: any) => ({
              height: r.height,
              bandwidth: r.bandwidth,
              enabled: r.enabled(),
            })) ?? [],
          qualityMenu:
            document.querySelector(".mentingo-vjs-quality-selector")?.textContent ?? null,
        };
      });
      const playing = measured.events.find((event: any) => event.name === "playing");
      let waitingAt: number | null = null,
        rebufferMs = 0,
        rebufferCount = 0;
      for (const event of measured.events) {
        if (
          event.name === "waiting" &&
          playing &&
          event.elapsedMs > playing.elapsedMs &&
          waitingAt === null
        ) {
          waitingAt = event.elapsedMs;
          rebufferCount++;
        }
        if (event.name === "playing" && waitingAt !== null) {
          rebufferMs += event.elapsedMs - waitingAt;
          waitingAt = null;
        }
      }
      if (waitingAt !== null) rebufferMs += measured.elapsedMs - waitingAt;
      const transfers = [...requests.values()];
      const failures: string[] = [];
      if (!playing || measured.currentTime < 4) failures.push("native_playback_not_demonstrated");
      if (measured.errorCode) failures.push(`native_player_error_${measured.errorCode}`);
      if (
        measured.renditions.length !== 4 ||
        (!profile.outage && measured.renditions.some((r: any) => !r.enabled))
      )
        failures.push("auto_ladder_not_fully_enabled");
      if (
        profile.kbps <= 500 &&
        !measured.samples.some((s: any) => s.time > 0 && s.height > 0 && s.height <= 360)
      )
        failures.push("low_resolution_playback_not_observed");
      if (interruption) {
        const resumed = measured.events.find(
          (event: any) => event.name === "playing" && event.elapsedMs > interruption.restoredAtMs,
        );
        interruption.resumeAfterRestoreMs = resumed
          ? resumed.elapsedMs - interruption.restoredAtMs
          : null;
        interruption.resumeAfterRetryMs =
          resumed && interruption.retryAtMs ? resumed.elapsedMs - interruption.retryAtMs : null;
        if (!resumed || measured.currentTime < interruption.positionAtRestore + 2)
          failures.push("playback_did_not_recover_after_outage");
        if (
          resumed &&
          interruption.positionBeforeRetry &&
          resumed.time < interruption.positionBeforeRetry - 0.5
        )
          failures.push("retry_lost_observed_position");
      }
      const report = {
        ...profile,
        interruption,
        status: failures.length ? "FAIL" : "PASS",
        failures,
        timeToPlayingMs: playing?.elapsedMs ?? null,
        rebufferCount,
        rebufferMs,
        httpBytes: transfers.reduce((sum, item) => sum + (item.bytes ?? item.chunkBytes), 0),
        bytesIncludeHeaders: true,
        ...measured,
        transfers,
      };
      reports.push(report);
      await page.screenshot({
        path: `${root}.local/sprint/screenshots/21-hls-${profile.name}.png`,
        fullPage: true,
      });
      console.log(
        JSON.stringify({
          profile: profile.name,
          status: report.status,
          failures,
          timeToPlayingMs: report.timeToPlayingMs,
          currentTime: measured.currentTime,
          heights: [...new Set(measured.samples.map((s: any) => s.height))],
          httpBytes: report.httpBytes,
          rebufferCount,
          rebufferMs,
          renditions: measured.renditions,
        }),
      );
    } finally {
      await context.close();
    }
  }
  if (reports.some((report) => report.status !== "PASS"))
    throw new Error("One or more native HLS acceptance profiles failed; inspect measured evidence");
} finally {
  await setup.close();
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (courseId)
    await courses
      .delete(courseId)
      .catch(() => console.log("Synthetic video course cleanup pending"));
  if (categoryId)
    await categories
      .delete(categoryId)
      .catch(() => console.log("Synthetic video category cleanup pending"));
  const output = process.env.SPRINT_VIDEO_OUTPUT ?? ".local/sprint/hls-bandwidth.json";
  if (!/^\.local\/sprint\/[a-z0-9-]+\.json$/.test(output))
    throw new Error("Invalid local evidence path");
  await writeFile(
    path.join(root, output),
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        fixture: { directory: fixture.directory, source: fixture.source, levels: fixture.levels },
        limits:
          "Native lesson player; synthetic public loopback HLS, CDP media network limits, warm application shell, no audio/CDN/mobile carrier/physical Android. Not a private-upload/transcoding or concurrent-video capacity proof.",
        profiles: reports,
      },
      null,
      2,
    ),
  );
}
