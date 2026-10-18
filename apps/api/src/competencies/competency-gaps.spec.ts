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
      mandatory: true,
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00Z",
      effectiveUntil: null,
      courseId: "course",
      learningPathId: "path",
    },
  ],
  orderedEvidence: [],
  orderedAssessments: [],
  revocations: [],
};
const assessment = (level = 2, expiresAt: string | null = null, id = "assessment") => ({
  id,
  userId: "employee",
  competencyId: "safety",
  level,
  expiresAt,
});
const evidence = (
  status: "approved" | "rejected" | "pending",
  level = 2,
  expiresAt: string | null = null,
) => ({ userId: "employee", competencyId: "safety", status, level, expiresAt });
it.each([
  [[], "missing", null],
  [[evidence("pending")], "pending", null],

  [[evidence("rejected")], "evidence_rejected", null],
] as const)("computes %s as %s", (records, status, currentLevel) => {
  expect(buildCompetencyGaps({ ...base, orderedEvidence: [...records] }, now)[0]).toMatchObject({
    status,
    currentLevel,
    requiredLevel: 2,
    courseId: "course",
    learningPathId: "path",
  });
});
it("pending or rejected evidence does not invalidate an approved assessment", () => {
  expect(
    buildCompetencyGaps(
      { ...base, orderedEvidence: [evidence("pending")], orderedAssessments: [assessment()] },
      now,
    )[0].status,
  ).toBe("met");
  expect(
    buildCompetencyGaps(
      { ...base, orderedEvidence: [evidence("rejected")], orderedAssessments: [assessment()] },
      now,
    )[0].status,
  ).toBe("met");
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

it.each([
  [1, null, "insufficient", 1],
  [2, null, "met", 2],
  [2, "2026-10-18T00:00:00Z", "expired", null],
] as const)("uses formal assessment %s / %s as %s", (level, expiresAt, status, currentLevel) => {
  expect(
    buildCompetencyGaps({ ...base, orderedAssessments: [assessment(level, expiresAt)] }, now)[0],
  ).toMatchObject({ status, currentLevel });
});
it("a lower formal reassessment supersedes the prior assessment rather than taking the historical maximum", () => {
  expect(
    buildCompetencyGaps(
      { ...base, orderedAssessments: [assessment(1, null, "new"), assessment(2)] },
      now,
    )[0],
  ).toMatchObject({ assessmentId: "new", status: "insufficient", currentLevel: 1 });
});
it("evidence approval alone does not award professional proficiency", () => {
  expect(
    buildCompetencyGaps({ ...base, orderedEvidence: [evidence("approved")] }, now)[0],
  ).toMatchObject({ status: "missing", currentLevel: null });
});
it("explicit revocation applies only to its assessment and preserves replacement assessments", () => {
  const revocation = {
    assessmentId: "assessment",
    kind: "revoked" as const,
    effectiveAt: "2026-01-01T00:00:00Z",
    endsAt: null,
  };
  expect(
    buildCompetencyGaps(
      { ...base, orderedAssessments: [assessment()], revocations: [revocation] },
      now,
    )[0].status,
  ).toBe("revoked");
  expect(
    buildCompetencyGaps(
      {
        ...base,
        orderedAssessments: [assessment(2, null, "replacement"), assessment()],
        revocations: [revocation],
      },
      now,
    )[0].status,
  ).toBe("met");
});
it("applies suspension only during its effective interval", () => {
  const suspension = {
    assessmentId: "assessment",
    kind: "suspended" as const,
    effectiveAt: "2026-10-17T00:00:00Z",
    endsAt: "2026-10-19T00:00:00Z",
  };
  expect(
    buildCompetencyGaps(
      { ...base, orderedAssessments: [assessment()], revocations: [suspension] },
      now,
    )[0].status,
  ).toBe("suspended");
  expect(
    buildCompetencyGaps(
      { ...base, orderedAssessments: [assessment()], revocations: [suspension] },
      Date.parse(suspension.endsAt),
    )[0].status,
  ).toBe("met");
});

const job = (jobRoleId = "role") => ({
  id: `job-${jobRoleId}`,
  userId: "employee",
  jobRoleId,
  organizationalUnitId: "unit",
  managerId: null,
  startsAt: null,
  endsAt: null,
  externalHrId: null,
  state: "active" as const,
  isPrimary: jobRoleId === "role",
  createdAt: "2026-01-01T00:00:00Z",
});
it("unions two active roles and uses the highest mandatory minimum without duplicate competency rows", () => {
  const requirements = [
    base.requirements[0],
    { ...base.requirements[0], id: "req2", jobRoleId: "second", minimumLevel: 3 },
  ];
  const result = buildCompetencyGaps(
    {
      ...base,
      requirements,
      jobAssignments: [job(), job("second")],
      orderedAssessments: [assessment(2)],
    },
    now,
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    requiredLevel: 3,
    mandatory: true,
    status: "insufficient",
    jobRoleIds: ["role", "second"],
  });
});
it("does not let an optional higher level raise another role's mandatory target", () => {
  const requirements = [
    base.requirements[0],
    { ...base.requirements[0], id: "req2", jobRoleId: "second", minimumLevel: 3, mandatory: false },
  ];
  expect(
    buildCompetencyGaps(
      {
        ...base,
        requirements,
        jobAssignments: [job(), job("second")],
        orderedAssessments: [assessment(2)],
      },
      now,
    )[0],
  ).toMatchObject({ requiredLevel: 2, mandatory: true, status: "met" });
});
it("excludes ended, expired and future assignments; legacy unknown start dates remain active", () => {
  expect(
    buildCompetencyGaps({ ...base, jobAssignments: [{ ...job(), state: "ended" }] }, now),
  ).toEqual([]);
  expect(
    buildCompetencyGaps(
      { ...base, jobAssignments: [{ ...job(), endsAt: "2026-01-01T00:00:00Z" }] },
      now,
    ),
  ).toEqual([]);
  expect(
    buildCompetencyGaps(
      { ...base, jobAssignments: [{ ...job(), startsAt: "2030-01-01T00:00:00Z" }] },
      now,
    ),
  ).toEqual([]);
  expect(buildCompetencyGaps({ ...base, jobAssignments: [job()] }, now)).toHaveLength(1);
});
