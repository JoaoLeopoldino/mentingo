import { describe, expect, it } from "vitest";

import { resolveTusEndpoint } from "./tus-endpoint";

describe("TUS endpoint routing and authentication", () => {
  it("routes API-relative SCORM uploads to the configured API rather than the static frontend", () => {
    expect(
      resolveTusEndpoint("/api/scorm/import/tus", "http://localhost:3000", "http://localhost:5173"),
    ).toEqual({ endpoint: "http://localhost:3000/api/scorm/import/tus", withCredentials: true });
  });
  it("preserves same-origin deployment and relative API configuration", () => {
    expect(resolveTusEndpoint("/api/file/videos/tus", undefined, "https://lms.example")).toEqual({
      endpoint: "https://lms.example/api/file/videos/tus",
      withCredentials: true,
    });
    expect(resolveTusEndpoint("/api/scorm/import/tus", "/", "https://lms.example").endpoint).toBe(
      "https://lms.example/api/scorm/import/tus",
    );
  });
  it("does not enable cookies for independent CDN endpoints", () => {
    expect(
      resolveTusEndpoint(
        "https://video.example/tus?signature=synthetic",
        "https://api.example",
        "https://lms.example",
      ),
    ).toEqual({
      endpoint: "https://video.example/tus?signature=synthetic",
      withCredentials: false,
    });
  });
  it("recognizes absolute API endpoints and rejects non-HTTP destinations", () => {
    expect(
      resolveTusEndpoint("https://api.example/tus", "https://api.example", "https://lms.example")
        .withCredentials,
    ).toBe(true);
    expect(() =>
      resolveTusEndpoint("file:///tmp/test", "https://api.example", "https://lms.example"),
    ).toThrow("Unsupported TUS endpoint protocol");
  });
});
