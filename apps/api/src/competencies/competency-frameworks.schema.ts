import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
const name = Type.String({ minLength: 1, maxLength: 200, pattern: "[^ ]" });
const code = Type.String({ minLength: 1, maxLength: 60, pattern: "^[A-Z0-9_-]+$" });
export const createCompetencyFrameworkSchema = Type.Object(
  {
    code,
    name,
    description: Type.String({ maxLength: 4000 }),
    categories: Type.Array(name, { minItems: 1, maxItems: 30, uniqueItems: true }),
  },
  { additionalProperties: false },
);
export const createCompetencyScaleSchema = Type.Object(
  {
    code,
    name,
    levels: Type.Array(
      Type.Object({ rank: Type.Integer({ minimum: 1, maximum: 20 }), label: name }),
      { minItems: 1, maxItems: 20 },
    ),
  },
  { additionalProperties: false },
);
export const competencyFrameworkSetupSchema = Type.Object({
  assessors: Type.Array(Type.Object({ id: UUIDSchema, name: Type.String() })),
  frameworks: Type.Array(
    Type.Object({
      ...createCompetencyFrameworkSchema.properties,
      id: UUIDSchema,
      active: Type.Boolean(),
    }),
  ),
  scales: Type.Array(Type.Object({ ...createCompetencyScaleSchema.properties, id: UUIDSchema })),
});
export type CreateCompetencyFramework = Static<typeof createCompetencyFrameworkSchema>;
export type CreateCompetencyScale = Static<typeof createCompetencyScaleSchema>;
export type CompetencyFrameworkSetup = Static<typeof competencyFrameworkSetupSchema>;
