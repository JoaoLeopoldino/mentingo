import type { SupportedLanguages } from "@repo/shared";
import type { UUIDType } from "src/common";

export type OfflineSnapshotClaims = {
  version: 1;
  tenantId: UUIDType;
  learnerId: UUIDType;
  courseId: UUIDType;
  lessonId: UUIDType;
  language: SupportedLanguages;
  learningCycle: number;
  definitionHash: string;
  issuedAt: number;
  expiresAt: number;
};
export type OfflineAssessmentResult = {
  state: "synced";
  clientAttemptId: UUIDType;
  attemptId: UUIDType;
  learningCycle: number;
  correctAnswerCount: number;
  wrongAnswerCount: number;
  questionCount: number;
  score: number;
  receivedAt: string;
  clientSubmittedAt: string;
};
