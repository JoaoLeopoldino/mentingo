import { readFileSync, writeFileSync } from "node:fs";
const path = "apps/web/app/locales/pt-AO/translation.json";
const source = JSON.parse(readFileSync("apps/web/app/locales/en/translation.json", "utf8"));
const target = JSON.parse(readFileSync(path, "utf8"));
const batch = JSON.parse(readFileSync("scripts/localization/pt-AO-generated-batch.json", "utf8"));
const tokens = (value) =>
  [...value.matchAll(/{{.*?}}|<\/?[\w]+[^>]*>|%[sd]/g)].map((x) => x[0]).sort();
let added = 0;
function apply(en, ao) {
  for (const [key, value] of Object.entries(en)) {
    if (value && typeof value === "object") {
      if (!ao[key]) ao[key] = {};
      apply(value, ao[key]);
      continue;
    }
    if (key in ao || !(value in batch)) continue;
    const translated = batch[value];
    if (JSON.stringify(tokens(value)) !== JSON.stringify(tokens(translated)))
      throw new Error(`Incompatible placeholders: ${value}`);
    if (!translated.trim()) throw new Error("Empty translation");
    ao[key] = translated;
    added++;
  }
}
apply(source, target);
writeFileSync(path, JSON.stringify(target, null, 2) + "\n");
console.log({ added });
