import { readFile } from "node:fs/promises";
const text = await readFile("apps/web/build/client/sw.js", "utf8");
if (!/url:"index.html",revision:"[a-f0-9]{32,64}"/.test(text))
  throw new Error("SPA document absent from precache");
if (!text.includes("assets/pdf.worker.min.mjs")) throw new Error("PDF worker absent from precache");
if (/url:"[^"\n]*\/api\//.test(text)) throw new Error("API response in precache");
const html = await readFile("apps/web/build/client/index.html", "utf8");
const required = [...html.matchAll(/(?:src|href)="\/(assets\/[^"?]+\.(?:js|css))"/g)].map(
  (match) => match[1],
);
for (const url of required)
  if (!text.includes(`url:"${url}"`))
    throw new Error(`Shell resource absent from precache: ${url}`);
console.log(
  `Verified revisioned SPA shell, local PDF worker and ${required.length} entry resources; no API cache entries`,
);
