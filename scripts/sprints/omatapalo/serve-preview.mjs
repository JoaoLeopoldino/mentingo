/** Local-only static SPA preview for the production service worker. */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const express = require("express");
const client = fileURLToPath(new URL("../../../apps/web/build/client/", import.meta.url));
await access(`${client}index.html`);
const app = express();
app.disable("x-powered-by");
app.use(express.static(client, { etag: true, maxAge: 0 }));
app.get("*", (_req, res) => res.sendFile(`${client}index.html`));
app.listen(5173, "127.0.0.1", () => console.log("Isolated SPA preview: http://localhost:5173"));
