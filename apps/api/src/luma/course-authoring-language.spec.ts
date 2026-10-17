import { BadRequestException } from "@nestjs/common";

import { requireLumaLanguage } from "./course-authoring-operation.mapper";

describe("Luma language boundary", () => {
  it("keeps the existing supported language unchanged", () => {
    expect(requireLumaLanguage("en")).toBe("en");
    expect(requireLumaLanguage("fr")).toBe("fr");
  });

  it("rejects Angola authoring explicitly instead of silently changing the course language", () => {
    expect(() => requireLumaLanguage("pt-AO")).toThrow(BadRequestException);
    expect(() => requireLumaLanguage("pt-AO")).toThrow(
      "courseAuthoring.errors.unsupportedLanguage",
    );
  });
});
