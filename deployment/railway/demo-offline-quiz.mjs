// One-shot job: creates two synthetic offline-capable assessment courses, then verifies the native
// offline quiz in a real Chromium against the PUBLIC hostname: download for offline, answer with the
// network disabled (answer stored on the device, status "pending"), reconnect and confirm the server
// validates and records it. "Ensaio técnico" is consumed by this test; "fictícia" is left unanswered
// for the live demonstration. Credentials come from the job environment and are never printed.
import { createRequire } from "node:module";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const api = required("SEED_API_URL").replace(/\/$/, "");
const publicUrl = required("SMOKE_PUBLIC_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const language = "pt-AO";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function login(email, password) {
  const response = await fetch(`${api}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`login ${email} -> ${response.status}`);
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
}
async function call(cookies, method, path, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookies },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${response.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

// 1. Courses (admin, REST).
const adminCookies = await login(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_NEW_PASSWORD"));
const learnerEmail = required("SEED_LEARNER_EMAIL");
const learnerId = (await call(adminCookies, "GET", `/api/user/all?keyword=${encodeURIComponent(learnerEmail)}`)).data.find(
  (user) => user.email === learnerEmail,
)?.id;
if (!learnerId) throw new Error("Learner not found");
const categoryId = (await call(adminCookies, "POST", "/api/category", { title: `Avaliações offline (fictício)${process.env.OFFLINE_CATEGORY_SUFFIX ?? ""}`, language })).data.id;

async function createOfflineCourse(title) {
  const courseId = (
    await call(adminCookies, "POST", "/api/course", {
      title,
      description: "Avaliação nativa com resposta offline. Conteúdo fictício para demonstração; Huíla e Benguela.",
      categoryId,
      language,
      status: "draft",
      hasCertificate: false,
    })
  ).data.id;
  const chapterId = (await call(adminCookies, "POST", "/api/chapter/beta-create-chapter", { title: "Operações em Huíla", courseId })).data.id;
  await call(adminCookies, "POST", "/api/lesson/beta-create-lesson/quiz", {
    title: "Avaliação de segurança",
    chapterId,
    type: "quiz",
    thresholdScore: 50,
    attemptsLimit: null,
    quizCooldownInHours: null,
    questions: [
      {
        type: "single_choice",
        title: "Que equipamento protege a cabeça?",
        language,
        displayOrder: 1,
        options: [
          { optionText: "Capacete de protecção", isCorrect: true, displayOrder: 1, language },
          { optionText: "Telemóvel", isCorrect: false, displayOrder: 2, language },
        ],
      },
    ],
  });
  await call(adminCookies, "PATCH", `/api/course/${courseId}`, { status: "published", language });
  await call(adminCookies, "POST", `/api/course/${courseId}/enroll-courses`, { studentIds: [learnerId] });
  return courseId;
}
const trialCourse = await createOfflineCourse("Avaliação offline (ensaio técnico)");
await createOfflineCourse("Avaliação offline fictícia");
console.log("Courses created: one consumed by this test, one left for the live demonstration");

// 2. Real Chromium as the learner.
const puppeteer = createRequire(process.env.PUPPETEER_FROM ?? "/app/package.json")("puppeteer");
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=pt-AO"],
});
const page = await browser.newPage();
page.setDefaultTimeout(60000);
await page.setViewport({ width: 1200, height: 1000 });
// The app picks its language from the browser: force pt-AO like a Portuguese-language device.
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setLocaleOverride", { locale: "pt-AO" }).catch(() => cdp.send("Emulation.setLocaleOverride", { locale: "pt-PT" }));
await page.setExtraHTTPHeaders({ "Accept-Language": "pt-AO,pt;q=0.9" });
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, "language", { get: () => "pt-AO" });
  Object.defineProperty(navigator, "languages", { get: () => ["pt-AO", "pt"] });
});
const bodyText = () => page.evaluate(() => document.body.innerText);
// Texts are matched in pt-AO and English so the check does not depend on the account language.
const waitText = (texts, timeout = 60000) =>
  page.waitForFunction((values) => values.some((value) => document.body.innerText.includes(value)), { timeout }, [].concat(texts));
const clickByText = async (selector, text) => {
  const ok = await page.evaluate(
    (sel, value) => {
      const el = [...document.querySelectorAll(sel)].find((node) => (node.innerText || node.getAttribute("aria-label") || node.textContent || "").includes(value));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
  if (!ok) throw new Error(`Element not found: ${selector} containing "${text}"`);
};

try {
  await page.goto(`${publicUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="auth-email-input"]');
  await page.type('[data-testid="auth-email-input"]', learnerEmail);
  await page.type('[data-testid="auth-password-input"]', required("SEED_LEARNER_NEW_PASSWORD"));
  await page.click('[data-testid="auth-login-button"]');
  await page.waitForFunction(() => !location.pathname.startsWith("/auth/login"), { timeout: 60000 });
  check("learner signs in through the real login page", true);

  await page.goto(`${publicUrl}/course/${trialCourse}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="offline-download"]');
  await page.click('[data-testid="offline-download"]');
  await waitText(["Disponível offline", "Available offline"]);
  check("course downloaded for offline use (assessment without answer keys)", true);

  await page.goto(`${publicUrl}/offline-learning`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="offline-quiz"]');
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        setTimeout(resolve, 15000);
      });
    }
    return Boolean(navigator.serviceWorker.controller);
  });
  check("service worker controls the page", controlled);

  await page.setOfflineMode(true);
  await clickByText('[role="radio"], label', "Capacete de protecção");
  await page.click('[data-testid="offline-quiz-submit"]');
  await waitText(["sincronização pendente", "awaiting synchronization"], 30000);
  check("answer stored on the device while offline (sync pending)", true);

  await page.setOfflineMode(false);
  await waitText(["Validada pelo servidor", "Validated by the server"], 90000);
  const text = await bodyText();
  check("server validated the answer after reconnecting", true, /100\s*%/.test(text) ? "score 100%" : "score not shown");
} catch (error) {
  check("offline quiz flow", false, String(error.message).slice(0, 200));
  console.log(`PAGE ${page.url()} :: ${(await bodyText().catch(() => "")).replace(/\s+/g, " ").slice(-700)}`);
} finally {
  await browser.close();
}
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} passed`);
if (results.some((ok) => !ok)) process.exit(1);
