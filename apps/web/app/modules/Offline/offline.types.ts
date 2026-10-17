import type { SupportedLanguages } from "@repo/shared";

export type OfflinePdf = { id: string; title: string; bytes: Uint8Array };
export type OfflineLesson = { id: string; title: string; html: string; pdfs: OfflinePdf[] };
export type OfflinePayload = {
  title: string;
  lessons: OfflineLesson[];
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
