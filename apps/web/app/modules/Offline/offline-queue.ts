import { offlineStorage } from "./offline-storage";

import type { OfflineStorage } from "./offline-storage";
import type { OfflineOperation, OfflineSubmission, OfflineSyncResult } from "./offline.types";

export class OfflineQueue {
  constructor(private readonly storage: OfflineStorage) {}
  list(owner: string) {
    return this.storage.operations.where("owner").equals(owner).toArray();
  }
  async enqueue(
    owner: string,
    courseId: string,
    lessonId: string,
    learningCycle: number,
    body: OfflineSubmission,
  ) {
    return this.storage.transaction("rw", this.storage.operations, async () => {
      const existing = await this.storage.operations
        .where("[owner+lessonId+learningCycle]")
        .equals([owner, lessonId, learningCycle])
        .first();
      if (existing) return existing;
      const operation: OfflineOperation = {
        owner,
        id: body.clientAttemptId,
        courseId,
        lessonId,
        learningCycle,
        body,
        state: "pending",
        tries: 0,
        nextRetryAt: 0,
      };
      await this.storage.operations.add(operation);
      return operation;
    });
  }
  private resultState(
    result: OfflineSyncResult | undefined,
    permanent: boolean,
  ): OfflineOperation["state"] {
    if (result) return "synced";
    if (permanent) return "failed";
    return "pending";
  }
  private claim(owner: string, now: number) {
    return this.storage.transaction("rw", this.storage.operations, async () => {
      const rows = await this.list(owner);
      const row = rows.find(
        (item) =>
          item.state === "pending" && item.nextRetryAt <= now && (item.leaseUntil ?? 0) <= now,
      );
      if (!row) return undefined;
      const claimed = {
        ...row,
        leaseId: crypto.randomUUID(),
        leaseUntil: now + 30000,
        tries: row.tries + 1,
      };
      await this.storage.operations.put(claimed);
      return claimed;
    });
  }
  async sync(
    owner: string,
    send: (body: OfflineSubmission) => Promise<OfflineSyncResult>,
    isCurrentOwner: () => boolean,
    now = Date.now(),
  ) {
    while (isCurrentOwner()) {
      const operation = await this.claim(owner, now);
      if (!operation) return;
      let result: OfflineSyncResult | undefined;
      let error: string | undefined;
      let permanent = false;
      try {
        if (!isCurrentOwner()) return;
        const received = await send(operation.body);
        if (received.clientAttemptId !== operation.id) throw new Error("offlineQuiz.error.receipt");
        result = received;
      } catch (failure) {
        const status = (failure as { response?: { status?: number } }).response?.status;
        permanent =
          status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
        error = permanent ? "offlineQuiz.conflict" : "offlineQuiz.retry";
      }
      await this.storage.transaction("rw", this.storage.operations, async () => {
        const current = await this.storage.operations.get([owner, operation.id]);
        // Logout/removal and a newer lease always take precedence over a late response.
        if (!current || current.leaseId !== operation.leaseId || !isCurrentOwner()) return;
        await this.storage.operations.put({
          ...current,
          state: this.resultState(result, permanent),
          result,
          error,
          leaseId: undefined,
          leaseUntil: undefined,
          nextRetryAt: now + Math.min(300000, 2000 * 2 ** Math.min(current.tries, 7)),
        });
      });
    }
  }
}
export const offlineQueue = new OfflineQueue(offlineStorage);
