import assert from "node:assert/strict";
import { test } from "node:test";
import * as formatting from "../src/utils/regional-formatting.ts";

test("Angola formatting uses Luanda time even across a UTC date boundary", () => {
  assert.equal(formatting.formatAngolaDateTime("2026-10-17T23:30:00Z"), "18/10/2026, 00:30");
});

test("Angola numbers, percentages and currency use the runtime locale", () => {
  assert.ok(Intl.NumberFormat.supportedLocalesOf(["pt-AO"]).length);
  assert.equal(formatting.formatAngolaNumber(1234.5).replace(/\s/g, ""), "1234,5");
  assert.match(formatting.formatAngolaCurrency(1234.5), /Kz/);
  assert.match(formatting.formatAngolaCurrency(1234.5), /,50/);
  assert.equal(formatting.formatAngolaPercent(0.25).replace(/\s/g, ""), "25%");
});
