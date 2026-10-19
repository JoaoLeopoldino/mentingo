import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../../../", import.meta.url));
process.chdir(root);
const suffix = randomBytes(5).toString("hex"),
  name = `utu-demo-proxy-${suffix}`;
const username = "qa",
  password = randomBytes(32).toString("hex");
const envPath = `.local/sprint/proxy-${suffix}.env`;
await writeFile(
  envPath,
  `PORT=8080\nAPI_PRIVATE_HOST=host.docker.internal\nAPI_PRIVATE_PORT=3002\nDEMO_GATE_USERNAME=${username}\nDEMO_GATE_PASSWORD=${password}\n`,
  { mode: 0o600, flag: "wx" },
);
const docker = (args) =>
  execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const startedAt = new Date().toISOString();
const keepAlive = setInterval(() => {}, 1000);
const missingName = `${name}-missing`;
let started = false;
try {
  let missingRejected = false;
  try {
    docker(["run", "--name", missingName, "--network", "none", "utu-mentingo-demo-proxy:20261019"]);
  } catch {
    missingRejected = true;
  }
  assert.ok(missingRejected, "Unconfigured gateway must fail closed");
  docker([
    "run",
    "-d",
    "--name",
    name,
    "--cpus",
    "0.5",
    "--memory",
    "96m",
    "--env-file",
    envPath,
    "-p",
    "127.0.0.1:5190:8080",
    "-v",
    `${root}apps/web/build/client:/usr/share/nginx/html:ro`,
    "utu-mentingo-demo-proxy:20261019",
  ]);
  started = true;
  for (let i = 0; i < 40; i++) {
    try {
      if (
        (await fetch("http://127.0.0.1:5190/healthz", { signal: AbortSignal.timeout(5000) }))
          .status === 200
      )
        break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const request = async (path, authorized = false) =>
    fetch(`http://127.0.0.1:5190${path}`, {
      signal: AbortSignal.timeout(5000),
      headers: authorized
        ? { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` }
        : {},
    });
  const checks = [];
  for (const path of [
    "/",
    "/auth/login",
    "/utu-signet.svg",
    "/api/healthcheck",
    "/socket.io/?EIO=4&transport=polling",
  ]) {
    const response = await request(path);
    assert.equal(response.status, 401, path);
    checks.push({ path, anonymous: 401 });
  }
  assert.equal((await request("/healthz")).status, 200);
  const html = await request("/auth/login", true);
  assert.equal(html.status, 200);
  assert.ok(html.headers.get("x-robots-tag")?.includes("noindex"));
  assert.ok((await html.text()).includes("Ambiente de Demonstração"));
  const api = await request("/api/healthcheck", true);
  assert.equal(api.status, 200);
  assert.equal((await api.json()).status, "ok");
  assert.equal((await request("/assets/test.js.map", true)).status, 404);
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    image: "utu-mentingo-demo-proxy:20261019",
    container: name,
    missingConfigRejected: true,
    checks,
    authorizedSpa: 200,
    authorizedApi: 200,
    sourceMap: 404,
    websocketUpgrade: "not tested",
    tusUpload: "not tested",
    railway: false,
  };
  await writeFile(".local/sprint/24-proxy-qa.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (started) docker(["stop", name]);
  clearInterval(keepAlive);
}
