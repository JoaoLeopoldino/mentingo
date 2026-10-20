// One-shot job: imports the unmodified, hash-pinned Rustici SCORM 1.2 sample package through the
// application's own import flow (init -> TUS upload -> complete), then publishes the course and
// enrols the synthetic learner. The package is public (CC BY 3.0 US, Rustici Software), is
// downloaded at run time and is never stored in Git. Credentials come from the job environment.
import { createHash } from "node:crypto";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const PACKAGE_URL =
  "https://scorm.com/wp-content/assets/golf_examples/PIFS/RuntimeBasicCalls_SCORM12.zip";
const PACKAGE_SHA256 = "b778566f79d56e48fab58f3a4e1fe8c1d05f372be9db3385aa1a1896063fe02a";
const api = required("SEED_API_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const language = "pt-AO";
let cookies = "";

const headers = (extra = {}) => ({ Origin: origin, ...(cookies ? { Cookie: cookies } : {}), ...extra });

async function json(method, path, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: headers({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const login = await fetch(`${api}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({ email: required("SEED_ADMIN_EMAIL"), password: required("SEED_ADMIN_NEW_PASSWORD") }),
});
if (!login.ok) throw new Error(`login -> ${login.status}`);
cookies = login.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");

// 1. Package: download and verify the pinned hash before trusting it.
const download = await fetch(PACKAGE_URL, { signal: AbortSignal.timeout(60000) });
if (!download.ok) throw new Error(`Package download failed: ${download.status}`);
const bytes = Buffer.from(await download.arrayBuffer());
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== PACKAGE_SHA256) throw new Error("Package changed: review source/license before updating the pinned hash");
console.log(`Package verified: ${bytes.length} bytes, sha256 ${sha.slice(0, 12)}…`);

// 2. Category and import session.
const category = await json("POST", "/api/category", { title: "SCORM 1.2 (demonstração)", language });
const categoryId = category.data.id;
const title = "SCORM 1.2 — pacote independente (demonstração)";
const filename = "RuntimeBasicCalls_SCORM12.zip";
const init = await json("POST", "/api/scorm/import/init", {
  action: "create-course",
  filename,
  sizeBytes: bytes.length,
  mimeType: "application/zip",
  metadata: {
    title,
    description:
      "Pacote público independente (Rustici Software, SCORM 1.2, CC BY 3.0 US), conteúdo original em inglês, sem modificações. Demonstração técnica do player SCORM.",
    categoryId,
    language,
    status: "draft",
    hasCertificate: true,
  },
});

// 3. TUS upload (creation + chunked PATCH), same protocol the browser client uses.
const tusUrl = new URL(init.tusEndpoint, api).href;
const b64 = (value) => Buffer.from(value).toString("base64");
const tusHeaders = Object.fromEntries(Object.entries(init.tusHeaders ?? {}).map(([k, v]) => [k, String(v)]));
const created = await fetch(tusUrl, {
  method: "POST",
  headers: headers({
    ...tusHeaders,
    "Tus-Resumable": "1.0.0",
    "Upload-Length": String(bytes.length),
    "Upload-Metadata": `filename ${b64(filename)},filetype ${b64("application/zip")},uploadId ${b64(init.uploadId)}`,
  }),
});
if (created.status !== 201) throw new Error(`TUS create -> ${created.status} ${(await created.text()).slice(0, 200)}`);
const location = new URL(created.headers.get("location"), tusUrl).href;

let offset = 0;
const part = init.partSize ?? 5 * 1024 * 1024;
while (offset < bytes.length) {
  const chunk = bytes.subarray(offset, Math.min(offset + part, bytes.length));
  const patched = await fetch(location, {
    method: "PATCH",
    headers: headers({
      ...tusHeaders,
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": String(offset),
      "Content-Type": "application/offset+octet-stream",
    }),
    body: chunk,
  });
  if (patched.status !== 204) throw new Error(`TUS patch -> ${patched.status} ${(await patched.text()).slice(0, 200)}`);
  offset = Number(patched.headers.get("upload-offset"));
}
console.log(`TUS upload complete: ${offset} bytes`);

// 4. Complete the import (server validates and extracts the package), then locate the course.
const completed = await json("POST", `/api/scorm/import/${init.packageId}/complete`);
console.log(`Import completed: ${completed.data.scoCount} SCO(s)`);

let course = null;
for (let attempt = 0; attempt < 30 && !course; attempt += 1) {
  const list = await json("GET", `/api/course/all?title=${encodeURIComponent(title)}&language=${language}&perPage=100`);
  course = list.data.find((entry) => entry.title === title) ?? null;
  if (!course) await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!course) throw new Error("SCORM course was not created after import");

// 5. Publish with certificate and enrol the synthetic learner.
await json("PATCH", `/api/course/update-has-certificate/${course.id}`, { hasCertificate: true });
await json("PATCH", `/api/course/${course.id}`, { status: "published", language });
const learnerEmail = required("SEED_LEARNER_EMAIL");
const users = (await json("GET", `/api/user/all?keyword=${encodeURIComponent(learnerEmail)}`)).data;
const learner = users.find((user) => user.email === learnerEmail);
if (!learner) throw new Error("Learner account not found");
await json("POST", `/api/course/${course.id}/enroll-courses`, { studentIds: [learner.id] });
console.log(JSON.stringify({ courseId: course.id, title }));
