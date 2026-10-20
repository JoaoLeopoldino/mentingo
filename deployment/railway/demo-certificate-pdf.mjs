// Read-only verification job: downloads the first demonstration course certificate as the synthetic
// learner and emits it as numbered base64 lines (plus a SHA-256) so it can be reassembled in order
// from deployment logs and inspected. Reads credentials from the job environment; never prints them.
import { createHash } from "node:crypto";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const api = required("SEED_API_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const language = "pt-AO";
let cookies = "";

async function call(method, path, body, raw = false) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${response.status}`);
  return raw ? response : { response, json: await response.json() };
}

const { response } = await call("POST", "/api/auth/login", {
  email: required("SEED_LEARNER_EMAIL"),
  password: required("SEED_LEARNER_NEW_PASSWORD"),
});
cookies = response.headers
  .getSetCookie()
  .map((cookie) => cookie.split(";")[0])
  .join("; ");

const me = (await call("GET", "/api/auth/current-user")).json.data;
const courseId = required("SEED_COURSE_IDS").split(",")[0];
const certificate = (
  await call("GET", `/api/certificates/certificate?courseId=${courseId}&userId=${me.id}&language=${language}`)
).json;
const download = await call(
  "POST",
  "/api/certificates/download",
  { certificateId: certificate.id, language },
  true,
);
const pdf = Buffer.from(await download.arrayBuffer());
console.log(`PDF ${pdf.length} bytes sha256=${createHash("sha256").update(pdf).digest("hex")}`);

const encoded = pdf.toString("base64");
const chunk = 120;
for (let index = 0; index * chunk < encoded.length; index += 1) {
  console.log(`PDF:${String(index).padStart(5, "0")}:${encoded.slice(index * chunk, (index + 1) * chunk)}`);
  await new Promise((resolve) => setTimeout(resolve, 5));
}
console.log("PDF:END");
