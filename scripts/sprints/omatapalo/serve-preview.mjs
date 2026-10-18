/** Local-only static SPA preview for the production service worker. */
import { request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const express = require("express");
const client = fileURLToPath(new URL("../../../apps/web/build/client/", import.meta.url));
await access(`${client}index.html`);
const app = express();
app.disable("x-powered-by");
// SCORM 1.2 packages discover window.parent.API and must remain same-origin.
// Explicit local routes only: SCORM content and public credentials, never a generic/open proxy.
const proxyLocalApi = (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) return res.sendStatus(405);
  const upstream = httpRequest(
    {
      hostname: "127.0.0.1",
      port: 3000,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: "localhost:3000", origin: "http://localhost:5173" },
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, {
        ...response.headers,
        "cache-control": "private, no-store",
      });
      response.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.sendStatus(502);
    else res.destroy();
  });
  req.on("aborted", () => upstream.destroy());
  upstream.end();
};
app.use("/api/scorm/content", proxyLocalApi);
app.get(["/api/certificates/share", "/api/certificates/share-image"], proxyLocalApi);
app.use(express.static(client, { etag: true, maxAge: 0 }));
app.get("*", (_req, res) => res.sendFile(`${client}index.html`));
app.listen(5173, "127.0.0.1", () => console.log("Isolated SPA preview: http://localhost:5173"));
