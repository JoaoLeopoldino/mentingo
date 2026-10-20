// One-shot job: uploads the Utu Lab default brand assets through the application's own settings
// endpoints (stored in the configured object storage, served as PWA icons). Authenticates with the
// tenant administrator credentials from the job environment; nothing is printed except status.
import { readFile } from "node:fs/promises";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const api = required("SEED_API_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const assets = process.env.BRAND_ASSETS_DIR ?? "/app/assets";
let cookies = "";

const login = await fetch(`${api}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({
    email: required("SEED_ADMIN_EMAIL"),
    password: required("SEED_ADMIN_NEW_PASSWORD"),
  }),
});
if (!login.ok) throw new Error(`login -> ${login.status}`);
cookies = login.headers
  .getSetCookie()
  .map((cookie) => cookie.split(";")[0])
  .join("; ");

async function upload(path, file, name) {
  const form = new FormData();
  form.append("logo", new Blob([await readFile(file)], { type: "image/png" }), name);
  const response = await fetch(`${api}${path}`, {
    method: "PATCH",
    headers: { Origin: origin, Cookie: cookies },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`PATCH ${path} -> ${response.status} ${text.slice(0, 300)}`);
  console.log(`PATCH ${path} -> ${response.status}`);
}

await upload("/api/settings/platform-logo", `${assets}/utu-logo.png`, "utu-logo.png");
await upload("/api/settings/platform-simple-logo", `${assets}/utu-signet.png`, "utu-signet.png");

const manifest = await (await fetch(`${api}/api/settings/manifest.webmanifest`, { headers: { Origin: origin } })).json();
console.log(`Manifest icons: ${(manifest.icons ?? []).map((icon) => `${icon.sizes} ${icon.type}`).join(", ")}`);
