import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUniqueJson, translationTokens, markupSequence } from "./translation-validation.mjs";
test("rejects duplicate and escaped duplicate keys", () => {
  assert.throws(() => parseUniqueJson('{"name":"A","name":"B"}'), /Duplicate/);
  assert.throws(() => parseUniqueJson('{"name":"A","na\\u006de":"B"}'), /Duplicate/);
});
test("allows the same key in distinct objects and nested arrays", () => {
  assert.deepEqual(parseUniqueJson('{"a":{"name":"A"},"b":[{"name":"B"}]}'), {
    a: { name: "A" },
    b: [{ name: "B" }],
  });
});
test("rejects invalid JSON before traversal", () => assert.throws(() => parseUniqueJson('{"a":}')));
test("compares interpolation, markup, printf and ICU variable names", () => {
  assert.deepEqual(
    translationTokens(
      "Hello {{name}} <strong>%s</strong> {count, plural, one {item} other {items}}",
    ),
    translationTokens("Olá {{name}} <strong>%s</strong> {count, plural, one {item} other {items}}"),
  );
  assert.notDeepEqual(translationTokens("{{count}}"), translationTokens("{{name}}"));
});

test("retains markup nesting order while allowing translated text", () => {
  assert.deepEqual(
    markupSequence("<strong><em>Hello</em></strong>"),
    markupSequence("<strong><em>Olá</em></strong>"),
  );
  assert.notDeepEqual(
    markupSequence("<strong><em>Hello</em></strong>"),
    markupSequence("<em><strong>Olá</strong></em>"),
  );
});
