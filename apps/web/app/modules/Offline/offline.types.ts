import type { SupportedLanguages } from "@repo/shared";
import type {
  GetOfflineAssessmentSnapshotResponse,
  SubmitOfflineAssessmentBody,
  SubmitOfflineAssessmentResponse,
} from "~/api/generated-api";

export type OfflinePdf = { id: string; title: string; bytes: Uint8Array };
export type OfflineLesson = { id: string; title: string; html: string; pdfs: OfflinePdf[] };
export type OfflinePayload = {
  title: string;
  lessons: OfflineLesson[];
  quizzes?: OfflineQuizSnapshot[];
  unavailable: { title: string; type: string }[];
};
export type OfflineCourse = {
  owner: string;
  courseId: string;
  language: SupportedLanguages;
  token: string;
  state: "downloading" | "ready" | "failed";
  downloadedAt: number;
  expiresAt: number;
  bytes: number;
  payload?: OfflinePayload;
};
export type OfflineCourseKey = [string, string, SupportedLanguages];

// The generated API remains the authority for wire contracts.
export type OfflineQuizSnapshot = GetOfflineAssessmentSnapshotResponse["data"];
export type OfflineSubmission = SubmitOfflineAssessmentBody;
export type OfflineSyncResult = SubmitOfflineAssessmentResponse["data"];
export type OfflineOperation = {
  owner: string;
  id: string;
  courseId: string;
  lessonId: string;
  learningCycle: number;
  body: OfflineSubmission;
  state: "pending" | "synced" | "failed";
  tries: number;
  nextRetryAt: number;
  leaseId?: string;
  leaseUntil?: number;
  error?: string;
  failureStatus?: number;
  archivedAt?: number;
  review?: Pick<OfflineQuizSnapshot, "title" | "language" | "questions">;
  result?: OfflineSyncResult;
};
