import { transitionDevelopmentPlan } from "./development-plan-transitions";
describe("Professional development plans", () => {
  it("requires employee submission and manager approval", () => {
    expect(transitionDevelopmentPlan("draft", "request_approval", false)).toBe("pending_approval");
    expect(() => transitionDevelopmentPlan("pending_approval", "approve", false)).toThrow();
    expect(transitionDevelopmentPlan("pending_approval", "approve", true)).toBe("active");
  });
  it("activity reports cannot confer proficiency or finish a plan", () => {
    expect(transitionDevelopmentPlan("active", "report_activity", false)).toBe("active");
    expect(() => transitionDevelopmentPlan("active", "complete", true)).toThrow();
    expect(() => transitionDevelopmentPlan("submitted", "complete", false)).toThrow();
  });
  it("preserves terminal decisions and allows reasoned return", () => {
    expect(transitionDevelopmentPlan("submitted", "return", true)).toBe("active");
    expect(transitionDevelopmentPlan("submitted", "complete", true)).toBe("completed");
    expect(() => transitionDevelopmentPlan("completed", "return", true)).toThrow();
    expect(() => transitionDevelopmentPlan("cancelled", "approve", true)).toThrow();
  });
});
