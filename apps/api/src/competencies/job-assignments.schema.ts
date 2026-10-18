import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
export const createCompetencyJobAssignmentSchema = Type.Object(
  {
    id: UUIDSchema,
    userId: UUIDSchema,
    jobRoleId: UUIDSchema,
    organizationalUnitId: UUIDSchema,
    managerId: Type.Union([UUIDSchema, Type.Null()]),
    startsAt: Type.String({ format: "date-time" }),
    endsAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
    externalHrId: Type.Union([
      Type.String({ minLength: 1, maxLength: 120, pattern: "[^ ]" }),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);
export const competencyJobAssignmentSchema = Type.Object({
  ...createCompetencyJobAssignmentSchema.properties,
  startsAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  isPrimary: Type.Boolean(),
  state: Type.Union([Type.Literal("active"), Type.Literal("ended")]),
  createdAt: Type.String(),
});
export type CreateCompetencyJobAssignment = Static<typeof createCompetencyJobAssignmentSchema>;
