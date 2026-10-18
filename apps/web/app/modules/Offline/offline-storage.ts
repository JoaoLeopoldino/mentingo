import Dexie from "dexie";

import type {
  OfflineCourse,
  OfflineCourseKey,
  OfflinePayload,
  OfflineOperation,
} from "./offline.types";
import type { SupportedLanguages } from "@repo/shared";
import type { Table } from "dexie";

export const OFFLINE_MAX_BYTES = 32 * 1024 * 1024;
export const OFFLINE_TTL = 7 * 24 * 60 * 60 * 1000;

export class OfflineStorage extends Dexie {
  courses!: Table<OfflineCourse, OfflineCourseKey>;
  operations!: Table<OfflineOperation, [string, string]>;
  constructor(name = "mentingo-private-learning") {
    super(name);
    this.version(1).stores({ courses: "[owner+courseId+language],owner,expiresAt" });
    this.version(2).stores({
      courses: "[owner+courseId+language],owner,expiresAt",
      operations: "[owner+id],owner,[owner+lessonId+learningCycle]",
    });
  }
  async list(owner: string, now = Date.now()) {
    await this.courses.where("expiresAt").belowOrEqual(now).delete();
    return this.courses.where("owner").equals(owner).toArray();
  }
  async remove(owner: string, courseId: string, language: SupportedLanguages) {
    await this.courses.delete([owner, courseId, language]);
  }
  async purgeOwner(owner: string) {
    await this.transaction("rw", this.courses, this.operations, async () => {
      await this.courses.where("owner").equals(owner).delete();
      await this.operations.where("owner").equals(owner).delete();
    });
  }
  async download(
    owner: string,
    courseId: string,
    language: SupportedLanguages,
    load: () => Promise<OfflinePayload>,
    now = Date.now(),
  ) {
    const key: OfflineCourseKey = [owner, courseId, language];
    const token = crypto.randomUUID();
    const base: OfflineCourse = {
      owner,
      courseId,
      language,
      token,
      state: "downloading",
      downloadedAt: now,
      expiresAt: now + OFFLINE_TTL,
      bytes: 0,
    };
    await this.courses.put(base);
    try {
      const payload = await load();
      const bytes =
        new TextEncoder().encode(
          JSON.stringify({
            ...payload,
            lessons: payload.lessons.map((lesson) => ({
              ...lesson,
              pdfs: lesson.pdfs.map(({ id, title }) => ({ id, title })),
            })),
          }),
        ).length +
        payload.lessons.reduce(
          (total, lesson) =>
            total + lesson.pdfs.reduce((size, pdf) => size + pdf.bytes.byteLength, 0),
          0,
        );
      if (bytes > OFFLINE_MAX_BYTES) throw new Error("offline.error.quota");
      const estimate = await navigator.storage?.estimate?.();
      if (
        estimate?.quota &&
        estimate.usage !== undefined &&
        estimate.quota - estimate.usage < bytes
      )
        throw new Error("offline.error.quota");
      await this.transaction("rw", this.courses, async () => {
        const current = await this.courses.get(key);
        if (current?.token !== token) throw new Error("offline.error.cancelled");
        await this.courses.put({ ...base, state: "ready", bytes, payload });
      });
    } catch (error) {
      await this.transaction("rw", this.courses, async () => {
        const current = await this.courses.get(key);
        if (current?.token === token) await this.courses.put({ ...base, state: "failed" });
      });
      throw error;
    }
  }
}
export const offlineStorage = new OfflineStorage();
