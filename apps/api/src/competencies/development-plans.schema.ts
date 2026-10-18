import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
const nullableId = Type.Union([UUIDSchema, Type.Null()]);
const text = Type.String({ minLength: 1, maxLength: 4000, pattern: "[^ ]" });
export const developmentPlanStateSchema = Type.Union(
  (["draft", "pending_approval", "active", "submitted", "completed", "cancelled"] as const).map(
    (x) => Type.Literal(x),
  ),
);
export const createDevelopmentPlanSchema = Type.Object(
  {
    id: UUIDSchema,
    userId: UUIDSchema,
    competencyId: UUIDSchema,
    targetLevel: Type.Integer({ minimum: 1, maximum: 20 }),
    title: Type.String({ minLength: 1, maxLength: 200, pattern: "[^ ]" }),
    deadline: Type.String({ format: "date-time" }),
    activities: Type.Array(
      Type.Object({ title: text, courseId: nullableId, learningPathId: nullableId }),
      { minItems: 1, maxItems: 20 },
    ),
  },
  { additionalProperties: false },
);
export const developmentPlanCommandSchema = Type.Object(
  {
    id: UUIDSchema,
    expectedVersion: Type.Integer({ minimum: 1 }),
    action: Type.Union(
      (
        [
          "request_approval",
          "approve",
          "report_activity",
          "submit",
          "return",
          "complete",
          "cancel",
        ] as const
      ).map((x) => Type.Literal(x)),
    ),
    rationale: text,
    activityId: nullableId,
  },
  { additionalProperties: false },
);
export const developmentPlansWorkspaceSchema = Type.Object({
  people: Type.Array(Type.Object({ id: UUIDSchema, name: Type.String() })),
  plans: Type.Array(
    Type.Object({
      ...Type.Omit(createDevelopmentPlanSchema, ["activities"]).properties,
      state: developmentPlanStateSchema,
      version: Type.Integer(),
      responsibleId: nullableId,
      createdBy: UUIDSchema,
      completedAssessmentId: nullableId,
      createdAt: Type.String(),
    }),
  ),
  activities: Type.Array(
    Type.Object({
      id: UUIDSchema,
      planId: UUIDSchema,
      title: text,
      courseId: nullableId,
      learningPathId: nullableId,
      reportedAt: Type.Union([Type.String(), Type.Null()]),
      reportedBy: nullableId,
    }),
  ),
  history: Type.Array(
    Type.Object({
      id: UUIDSchema,
      planId: UUIDSchema,
      actorId: UUIDSchema,
      action: Type.String(),
      rationale: text,
      version: Type.Integer(),
      fromState: Type.Union([developmentPlanStateSchema, Type.Null()]),
      toState: developmentPlanStateSchema,
      activityId: nullableId,
      assessmentId: nullableId,
      createdAt: Type.String(),
    }),
  ),
});
export type CreateDevelopmentPlan = Static<typeof createDevelopmentPlanSchema>;
export type DevelopmentPlanCommand = Static<typeof developmentPlanCommandSchema>;
export type DevelopmentPlanState = Static<typeof developmentPlanStateSchema>;
export type DevelopmentPlansWorkspace = Static<typeof developmentPlansWorkspaceSchema>;
