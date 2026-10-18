import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
const name = Type.String({ minLength: 1, maxLength: 200, pattern: "[^ ]" });
const text = Type.String({ maxLength: 4000 });
const date = Type.String({ format: "date-time" });
const nullableDate = Type.Union([date, Type.Null()]);
const nullableId = Type.Union([UUIDSchema, Type.Null()]);
export const createCompetencySchema = Type.Object(
  {
    code: Type.String({ minLength: 1, maxLength: 60, pattern: "^[A-Z0-9_-]+$" }),
    name,
    description: text,
    category: name,
    levels: Type.Array(
      Type.Object({ rank: Type.Integer({ minimum: 1, maximum: 20 }), label: name }),
      { minItems: 1, maxItems: 20 },
    ),
  },
  { additionalProperties: false },
);
export const createJobRoleSchema = Type.Pick(createCompetencySchema, ["code", "name"]);
export const competencyActiveSchema = Type.Object(
  { active: Type.Boolean() },
  { additionalProperties: false },
);
export const requirementSchema = Type.Object(
  {
    jobRoleId: UUIDSchema,
    competencyId: UUIDSchema,
    minimumLevel: Type.Integer({ minimum: 1, maximum: 20 }),
    effectiveFrom: date,
    effectiveUntil: nullableDate,
    courseId: nullableId,
    learningPathId: nullableId,
  },
  { additionalProperties: false },
);
export const assignmentSchema = Type.Object(
  { userId: UUIDSchema, jobRoleId: UUIDSchema, organizationalUnitId: UUIDSchema },
  { additionalProperties: false },
);
export const evidenceSchema = Type.Object(
  {
    userId: UUIDSchema,
    competencyId: UUIDSchema,
    level: Type.Integer({ minimum: 1, maximum: 20 }),
    status: Type.Union([
      Type.Literal("pending"),
      Type.Literal("approved"),
      Type.Literal("rejected"),
    ]),
    source: name,
    evidence: Type.String({ minLength: 1, maxLength: 4000, pattern: "[^ ]" }),
    expiresAt: nullableDate,
    reviewAt: nullableDate,
  },
  { additionalProperties: false },
);
export const competencyIdResponseSchema = Type.Object({ id: UUIDSchema });
const competency = Type.Object({
  ...createCompetencySchema.properties,
  id: UUIDSchema,
  active: Type.Boolean(),
});
const role = Type.Object({ ...createJobRoleSchema.properties, id: UUIDSchema });
const requirement = Type.Object({ ...requirementSchema.properties, id: UUIDSchema });
const evidence = Type.Object({
  ...evidenceSchema.properties,
  id: UUIDSchema,
  recordedBy: UUIDSchema,
  assessorId: nullableId,
  assessedAt: nullableDate,
  createdAt: date,
});
export const competencyWorkspaceSchema = Type.Object({
  learning: Type.Object({
    courses: Type.Array(Type.Object({ id: UUIDSchema, name: Type.String() })),
    learningPaths: Type.Array(Type.Object({ id: UUIDSchema, name: Type.String() })),
  }),
  canManage: Type.Boolean(),
  canAssess: Type.Boolean(),
  catalog: Type.Array(competency),
  roles: Type.Array(role),
  requirements: Type.Array(requirement),
  units: Type.Array(Type.Object({ id: UUIDSchema, name: Type.String() })),
  employees: Type.Array(
    Type.Object({
      id: UUIDSchema,
      name: Type.String(),
      jobRoleId: nullableId,
      organizationalUnitId: nullableId,
    }),
  ),
  matrix: Type.Array(
    Type.Object({
      userId: UUIDSchema,
      competencyId: UUIDSchema,
      requiredLevel: Type.Integer(),
      currentLevel: Type.Union([Type.Integer(), Type.Null()]),
      status: Type.Union([
        Type.Literal("met"),
        Type.Literal("missing"),
        Type.Literal("insufficient"),
        Type.Literal("pending"),
        Type.Literal("rejected"),
        Type.Literal("expired"),
      ]),
      courseId: nullableId,
      learningPathId: nullableId,
    }),
  ),
  evidence: Type.Array(evidence),
});
export type CreateCompetency = Static<typeof createCompetencySchema>;
export type CreateJobRole = Static<typeof createJobRoleSchema>;
export type CompetencyRequirement = Static<typeof requirementSchema>;
export type CompetencyAssignment = Static<typeof assignmentSchema>;
export type CompetencyEvidence = Static<typeof evidenceSchema>;
export type CompetencyWorkspace = Static<typeof competencyWorkspaceSchema>;
export type CompetencyIdResponse = Static<typeof competencyIdResponseSchema>;
