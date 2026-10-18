import { describe, expect, it } from "vitest";

import { applyHlsQualitySelection, getHlsQualityOptions, HLS_AUTO_HD_VALUE } from "./hlsQuality";

describe("HLS automatic adaptation", () => {
  it("keeps low-bandwidth renditions eligible alongside HD instead of imposing a 720p floor", () => {
    const levels = [144, 240, 360, 480, 720, 1080].map((height) => ({ height, enabled: true }));
    applyHlsQualitySelection(levels, HLS_AUTO_HD_VALUE);
    expect(levels.filter((x) => x.enabled).map((x) => x.height)).toEqual([
      144, 240, 360, 480, 720, 1080,
    ]);
  });
  it("restores the complete adaptation ladder after a fixed high-resolution choice", () => {
    const levels = [240, 480, 1080].map((height) => ({ height, enabled: true }));
    applyHlsQualitySelection(levels, "fixed:1080");
    expect(levels.map((x) => x.enabled)).toEqual([false, false, true]);
    applyHlsQualitySelection(levels, HLS_AUTO_HD_VALUE);
    expect(levels.map((x) => x.enabled)).toEqual([true, true, true]);
  });
  it("allows a low-resolution-only ladder to adapt between all available renditions", () => {
    const levels = [144, 240, 360].map((height) => ({ height, enabled: false }));
    applyHlsQualitySelection(levels, HLS_AUTO_HD_VALUE);
    expect(levels.every((x) => x.enabled)).toBe(true);
  });
  it("preserves explicit quality choices and exposes the existing automatic selection token", () => {
    const levels = [240, 720].map((height) => ({ height, enabled: true }));
    applyHlsQualitySelection(levels, "fixed:240");
    expect(levels.map((x) => x.enabled)).toEqual([true, false]);
    expect(getHlsQualityOptions(levels).map((x) => x.value)).toEqual([
      HLS_AUTO_HD_VALUE,
      "fixed:720",
      "fixed:240",
    ]);
  });
});
