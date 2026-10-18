import { type Static, Type } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

export const offlineSnapshotResponseSchema = Type.Object({
  snapshot: Type.String(),
  lessonId: UUIDSchema,
  courseId: UUIDSchema,
  title: Type.String(),
  language: supportedLanguagesSchema,
  learningCycle: Type.Integer({ minimum: 1 }),
  expiresAt: Type.String({ format: "date-time" }),
  questions: Type.Array(
    Type.Object({
      id: UUIDSchema,
      title: Type.String(),
      prompt: Type.String(),
      options: Type.Array(Type.Object({ id: UUIDSchema, label: Type.String() })),
    }),
  ),
});
export type OfflineSnapshotResponse = Static<typeof offlineSnapshotResponseSchema>;
export const offlineAssessmentSyncSchema = Type.Object(
  {
    clientAttemptId: UUIDSchema,
    snapshot: Type.String({ minLength: 32, maxLength: 16384 }),
    clientSubmittedAt: Type.String({ format: "date-time" }),
    answers: Type.Array(
      Type.Object(
        { questionId: UUIDSchema, optionId: UUIDSchema },
        { additionalProperties: false },
      ),
      { minItems: 1, maxItems: 100 },
    ),
  },
  { additionalProperties: false },
);
export type OfflineAssessmentSyncBody = Static<typeof offlineAssessmentSyncSchema>;
export const offlineAssessmentResultSchema = Type.Object({
  state: Type.Literal("synced"),
  clientAttemptId: UUIDSchema,
  attemptId: UUIDSchema,
  learningCycle: Type.Integer({ minimum: 1 }),
  correctAnswerCount: Type.Integer(),
  wrongAnswerCount: Type.Integer(),
  questionCount: Type.Integer(),
  score: Type.Number(),
  receivedAt: Type.String({ format: "date-time" }),
  clientSubmittedAt: Type.String({ format: "date-time" }),
});
