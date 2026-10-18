import { buildCompetencyGaps } from "./competency-gaps";

import type { CompetencyGapInput } from "./competencies.types";
const now = Date.parse("2026-10-18T00:00:00Z");
const base: CompetencyGapInput = {
  employees: [{ id: "employee", jobRoleId: "role" }],
  catalog: [{ id: "safety", active: true }],
  requirements: [
    {
      id: "req",
      jobRoleId: "role",
      competencyId: "safety",
      minimumLevel: 2,
      effectiveFrom: "2026-01-01T00:00:00Z",
      effectiveUntil: null,
      courseId: "course",
      learningPathId: "path",
    },
  ],
  orderedEvidence: [],
};
const evidence = (
  status: "approved" | "rejected" | "pending",
  level = 2,
  expiresAt: string | null = null,
) => ({ userId: "employee", competencyId: "safety", status, level, expiresAt });
it.each([
  [[], "missing", null],
  [[evidence("pending")], "pending", null],
  [[evidence("approved", 1)], "insufficient", 1],
  [[evidence("approved")], "met", 2],
  [[evidence("approved", 2, "2026-10-18T00:00:00Z")], "expired", null],
  [[evidence("rejected")], "rejected", null],
] as const)("computes %s as %s", (records, status, currentLevel) => {
  expect(buildCompetencyGaps({ ...base, orderedEvidence: [...records] }, now)[0]).toMatchObject({
    status,
    currentLevel,
    requiredLevel: 2,
    courseId: "course",
    learningPathId: "path",
  });
});
it("pending evidence cannot override an assessment, but a newer rejection does", () => {
  expect(
    buildCompetencyGaps(
      { ...base, orderedEvidence: [evidence("pending"), evidence("approved")] },
      now,
    )[0].status,
  ).toBe("met");
  expect(
    buildCompetencyGaps(
      { ...base, orderedEvidence: [evidence("rejected"), evidence("approved")] },
      now,
    )[0].status,
  ).toBe("rejected");
});
it("excludes inactive competencies and requirements outside their effective interval", () => {
  expect(buildCompetencyGaps({ ...base, catalog: [{ id: "safety", active: false }] }, now)).toEqual(
    [],
  );
  expect(
    buildCompetencyGaps(
      {
        ...base,
        requirements: [{ ...base.requirements[0], effectiveFrom: "2027-01-01T00:00:00Z" }],
      },
      now,
    ),
  ).toEqual([]);
  expect(
    buildCompetencyGaps(
      {
        ...base,
        requirements: [{ ...base.requirements[0], effectiveUntil: "2026-10-18T00:00:00Z" }],
      },
      now,
    ),
  ).toEqual([]);
});
