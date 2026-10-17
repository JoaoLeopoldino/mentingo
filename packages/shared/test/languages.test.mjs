import assert from "node:assert/strict";
import { test } from "node:test";

import * as languages from "../src/constants/languages.ts";

test("Portuguese language preferences resolve to the supported Angola locale", () => {
  assert.equal(languages.SUPPORTED_LANGUAGES.PT_AO, "pt-AO");
  for (const input of ["pt-AO", "pt-ao", "pt-PT", "pt-BR", "pt", " pt_AO "]) {
    assert.equal(languages.normalizeSupportedLanguage(input), "pt-AO", input);
  }
});

test("existing regional languages resolve without treating unknown tags as supported", () => {
  for (const [input, expected] of [["en-GB", "en"], ["DE-de", "de"], ["fr-CA", "fr"]]) {
    assert.equal(languages.normalizeSupportedLanguage(input), expected);
  }
  for (const input of [undefined, null, "", " ", "invalid_!", "zz-ZZ"]) {
    assert.equal(languages.normalizeSupportedLanguage(input), undefined);
  }
  assert.equal(languages.isSupportedLanguage("pt-AO"), true);
  assert.equal(languages.isSupportedLanguage("pt-PT"), false);
  assert.equal(languages.isSupportedLanguage("pt-ao"), false);
});

test("a language added to the platform has explicit English fallback in untranslated channels", () => {
  const labels = languages.withEnglishLanguageFallback({ en: "Course", pl: "Kurs" });
  assert.equal(labels["pt-AO"], "Course");
  assert.equal(labels.pl, "Kurs");
  assert.equal(languages.withEnglishLanguageFallback({ en: "Course", "pt-AO": "Formação" })["pt-AO"], "Formação");
});
