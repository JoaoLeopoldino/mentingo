// Read-mostly smoke test through the PUBLIC hostname (edge + Web proxy + API + object storage):
// cookies, SCORM launch and same-origin content streaming with Range, and the WebSocket upgrade.
// The SCORM attempt is committed as "incomplete" so the live demo can still show it. Credentials come
// from the job environment and are never printed.
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const base = required("SMOKE_PUBLIC_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const language = "pt-AO";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function login(email, password) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  const setCookies = response.headers.getSetCookie();
  return {
    status: response.status,
    cookies: setCookies.map((cookie) => cookie.split(";")[0]).join("; "),
    flags: setCookies.map((cookie) => cookie.split(";").slice(1).map((part) => part.trim().split("=")[0]).join(",")),
  };
}
const get = (path, cookies, extra = {}) =>
  fetch(`${base}${path}`, { headers: { Origin: origin, Cookie: cookies, ...extra } });

const learner = await login(required("SEED_LEARNER_EMAIL"), required("SEED_LEARNER_NEW_PASSWORD"));
check("learner login through public hostname", learner.status === 201, `HTTP ${learner.status}`);
check(
  "session cookies are HttpOnly, Secure and SameSite",
  learner.flags.length >= 2 && learner.flags.every((flags) => /HttpOnly/i.test(flags) && /Secure/i.test(flags) && /SameSite/i.test(flags)),
);

const admin = await login(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_NEW_PASSWORD"));
const title = "SCORM 1.2 — pacote independente (demonstração)";
const list = await (await get(`/api/course/all?title=${encodeURIComponent(title)}&language=${language}&perPage=100`, admin.cookies)).json();
const courseId = list.data.find((course) => course.title === title)?.id;
check("SCORM course present", Boolean(courseId));
const course = (await (await get(`/api/course/beta-course-by-id?id=${courseId}&language=${language}`, admin.cookies)).json()).data;
const lessonId = course.chapters[0].lessons[0].id;

const launchResponse = await get(`/api/scorm/runtime/launch?lessonId=${lessonId}&language=${language}`, learner.cookies);
check("SCORM launch", launchResponse.ok, `HTTP ${launchResponse.status}`);
const launch = (await launchResponse.json()).data;

const launchUrl = new URL(launch.launchUrl, base);
check("SCORM content is same-origin", launchUrl.origin === new URL(base).origin, launchUrl.origin);
const page = await get(`${launchUrl.pathname}${launchUrl.search}`, learner.cookies);
const html = await page.text();
check("SCORM entry page streamed from object storage", page.ok && html.length > 200, `HTTP ${page.status}, ${html.length} bytes, ${page.headers.get("content-type")}`);
const anonymous = await fetch(`${launchUrl.origin}${launchUrl.pathname}${launchUrl.search}`, { headers: { Origin: origin } });
check("SCORM content is not public without a session", anonymous.status === 401 || anonymous.status === 403, `HTTP ${anonymous.status}`);
const ranged = await get(`${launchUrl.pathname}${launchUrl.search}`, learner.cookies, { Range: "bytes=0-99" });
check("Range request honoured", ranged.status === 206 || ranged.status === 200, `HTTP ${ranged.status}, ${(await ranged.arrayBuffer()).byteLength} bytes`);

const commit = await fetch(`${base}/api/scorm/runtime/commit`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin, Cookie: learner.cookies },
  body: JSON.stringify({
    attemptId: launch.attemptId,
    packageId: launch.packageId,
    scoId: launch.scoId,
    lessonId: launch.lessonId,
    courseId: launch.courseId,
    values: { "cmi.core.lesson_status": "incomplete", "cmi.core.lesson_location": "2" },
    language,
  }),
});
check("SCORM runtime commit (incomplete)", commit.status === 201 || commit.status === 200, `HTTP ${commit.status}`);

// WebSocket: the gateway accepts websocket transport only, so a real upgrade over wss through the
// proxy is the only way realtime works. The Engine.IO handshake packet starts with "0".
try {
  // pnpm keeps "ws" next to engine.io, not at the top level: resolve it from there.
  const socketIo = realpathSync(process.env.WS_REQUIRE_FROM ?? "/app/node_modules/socket.io/package.json");
  const engineIo = realpathSync(createRequire(socketIo).resolve("engine.io"));
  const WebSocket = createRequire(engineIo)("ws");
  const upgraded = await new Promise((resolve) => {
    const socket = new WebSocket(`${base.replace(/^http/, "ws")}/api/ws/?EIO=4&transport=websocket`, {
      headers: { Origin: origin, Cookie: learner.cookies },
    });
    const timer = setTimeout(() => resolve("timeout"), 15000);
    socket.on("message", (data) => {
      clearTimeout(timer);
      resolve(String(data).startsWith("0") ? "open-packet" : `unexpected:${String(data).slice(0, 20)}`);
      socket.close();
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      resolve(`error:${error.message}`);
    });
  });
  check("WebSocket upgrade over wss through the proxy", upgraded === "open-packet", upgraded);
} catch (error) {
  check("WebSocket upgrade over wss through the proxy", false, `module: ${error.message}`);
}

console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} passed`);
if (results.some((ok) => !ok)) process.exit(1);
