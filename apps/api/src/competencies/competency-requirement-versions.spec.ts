import { resolveCompetencyRequirements } from "./competency-requirement-versions";
const now = Date.parse("2026-10-18T00:00:00Z");
const base = {
  id: "revision1",
  requirementId: "rule",
  jobRoleId: "role",
  competencyId: "competency",
  minimumLevel: 1,
  mandatory: true,
  version: 1,
  effectiveFrom: "2026-01-01T00:00:00Z",
  effectiveUntil: null,
  courseId: null,
  learningPathId: null,
  recordedBy: null,
  createdAt: "2026-01-01T00:00:00Z",
};
it("does not apply a future revision prematurely", () => {
  const result = resolveCompetencyRequirements(
    [
      base,
      {
        ...base,
        id: "revision2",
        version: 2,
        minimumLevel: 2,
        effectiveFrom: "2027-01-01T00:00:00Z",
      },
    ],
    now,
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: "rule", version: 1, minimumLevel: 1 });
});
it("selects the newest effective revision regardless of input order and retains optionality", () => {
  expect(
    resolveCompetencyRequirements(
      [{ ...base, version: 2, mandatory: false, minimumLevel: 2 }, base],
      now,
    )[0],
  ).toMatchObject({ version: 2, mandatory: false, minimumLevel: 2 });
});
it("does not resurrect an earlier open-ended requirement when the latest effective rule expires", () => {
  expect(
    resolveCompetencyRequirements(
      [base, { ...base, version: 2, effectiveUntil: "2026-09-01T00:00:00Z" }],
      now,
    ),
  ).toEqual([]);
});
