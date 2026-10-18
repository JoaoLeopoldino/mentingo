import { parseUniqueJson, translationTokens } from "./translation-validation.mjs";
import { readFileSync } from "node:fs";
const load = (language) =>
  parseUniqueJson(readFileSync(`apps/web/app/locales/${language}/translation.json`, "utf8"));
const flat = (node, prefix = "", result = {}) => {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flat(value, path, result);
    else result[path] = value;
  }
  return result;
};
const en = flat(load("en")),
  ao = flat(load("pt-AO"));
const tokens = translationTokens;
const missing = Object.keys(en).filter((key) => !(key in ao));
const identical = [];
const errors = [];
for (const [key, value] of Object.entries(ao)) {
  if (!(key in en)) {
    errors.push(`Unknown key ${key}`);
    continue;
  }
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`Empty/non-string ${key}`);
    continue;
  }
  if (JSON.stringify(tokens(value)) !== JSON.stringify(tokens(en[key])))
    errors.push(`Placeholder/markup mismatch ${key}`);
  if (value === en[key]) identical.push(key);
  if (key.endsWith("_one") && !(key.replace(/_one$/, "_other") in ao))
    errors.push(`Missing plural pair ${key}`);
}
const critical = [
  "loginView",
  "navigationSideBar",
  "studentCourseView",
  "studentLessonView",
  "studentCertificateView",
  "competencies",
  "offlineRecovery",
  "reports",
];
const criticalMissing = missing.filter((key) => critical.includes(key.split(".")[0]));
console.log(
  JSON.stringify(
    {
      referenceKeys: Object.keys(en).length,
      presentKeys: Object.keys(ao).length,
      structuralPercent: (100 * Object.keys(ao).length) / Object.keys(en).length,
      missingKeys: missing.length,
      identicalToEnglish: identical.length,
      nonIdenticalKeys: Object.keys(ao).length - identical.length,
      humanReviewedLinguisticPercent: null,
      criticalMissing,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length || criticalMissing.length) process.exitCode = 1;
if (process.argv.includes("--require-complete") && missing.length) process.exitCode = 1;
