import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const load = (language) =>
  JSON.parse(
    readFileSync(
      new URL(`../../../apps/web/app/locales/${language}/translation.json`, import.meta.url),
      "utf8",
    ),
  );
const flatten = (node, prefix = "", result = {}) => {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) flatten(value, path, result);
    else result[path] = value;
  }
  return result;
};
const reference = flatten(load("en"));
const translated = flatten(load("pt-AO"));
const tokens = (text, pattern) => [...text.matchAll(pattern)].map((m) => m[0]).sort();

test("the Angola catalogue has valid keys, interpolation, markup and nonempty strings", () => {
  for (const [key, value] of Object.entries(translated)) {
    assert.ok(key in reference, `Unknown key: ${key}`);
    assert.equal(typeof value, "string", key);
    assert.ok(value.trim(), `Empty translation: ${key}`);
    assert.deepEqual(tokens(value, /{{.*?}}/g), tokens(reference[key], /{{.*?}}/g), key);
    assert.deepEqual(
      tokens(value, /<\/?[\w]+[^>]*>/g),
      tokens(reference[key], /<\/?[\w]+[^>]*>/g),
      key,
    );
  }
});

test("primary learner and authentication scopes are completely translated", () => {
  for (const scope of [
    "loginView",
    "forgotPasswordView",
    "navigationSideBar",
    "studentCoursesView",
    "studentLessonView",
    "studentCourseView",
    "studentQuizSummaryView",
    "studentCertificateView",
    "dashboardHome",
  ]) {
    const keys = Object.keys(reference).filter((key) => key.startsWith(`${scope}.`));
    assert.ok(keys.length, `Unknown scope: ${scope}`);
    assert.deepEqual(
      keys.filter((key) => !(key in translated)),
      [],
      `Missing ${scope}`,
    );
  }
});

test("every existing interface language can label the Angola selector option", () => {
  for (const language of ["en", "pl", "de", "lt", "cs", "es", "fr", "pt-AO"]) {
    const catalogue = load(language);
    assert.ok(catalogue.common.languages["pt-AO"]);
    assert.ok(catalogue.changeUserLanguageView.options.angolanPortuguese);
  }
});

test("translation coverage stays explicit rather than counting the English fallback", () => {
  const missing = Object.keys(reference).filter((key) => !(key in translated));
  console.log(
    `pt-AO: ${Object.keys(translated).length}/${Object.keys(reference).length} (${((100 * Object.keys(translated).length) / Object.keys(reference).length).toFixed(2)}%); English fallback: ${missing.length}`,
  );
  assert.deepEqual(missing, [], "Every reference key needs an explicit Angola value");
  assert.equal(Object.keys(translated).length, Object.keys(reference).length);
});

test("Angola plurals keep both singular and plural keys together", () => {
  for (const key of Object.keys(translated).filter((key) => key.endsWith("_one"))) {
    assert.ok(key.replace(/_one$/, "_other") in translated, `Missing plural: ${key}`);
  }
});
