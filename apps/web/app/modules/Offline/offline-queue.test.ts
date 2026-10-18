import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it } from "vitest";

import { OfflineQueue } from "./offline-queue";
import { OfflineStorage } from "./offline-storage";

import type { OfflineSyncResult } from "./offline.types";

let storage: OfflineStorage;
let queue: OfflineQueue;
const body = {
  clientAttemptId: "00000000-0000-4000-8000-000000000001",
  snapshot: "signed-snapshot",
  clientSubmittedAt: "2026-10-18T00:00:00.000Z",
  answers: [{ questionId: "question", optionId: "option" }],
};
beforeEach(() => {
  storage = new OfflineStorage(`offline-queue-${crypto.randomUUID()}`);
  queue = new OfflineQueue(storage);
});
afterEach(async () => {
  await storage.delete();
});
it("persists an offline submission across reopening and prevents double clicks", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  await queue.enqueue("alice", "course", "lesson", 1, {
    ...body,
    clientAttemptId: crypto.randomUUID(),
  });
  const name = storage.name;
  storage.close();
  storage = new OfflineStorage(name);
  queue = new OfflineQueue(storage);
  const rows = await queue.list("alice");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ state: "pending", body });
  expect(await queue.list("bob")).toEqual([]);
});
it("keeps the immutable payload after a lost acknowledgement and retries after reconnect", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  const sent: unknown[] = [];
  await queue.sync(
    "alice",
    async (submission) => {
      sent.push(submission);
      throw new TypeError("Acknowledgement lost after server commit");
    },
    () => true,
    1000,
  );
  expect((await queue.list("alice"))[0]).toMatchObject({ state: "pending", tries: 1 });
  const result = {
    state: "synced",
    clientAttemptId: body.clientAttemptId,
    attemptId: "server-id",
    learningCycle: 1,
    correctAnswerCount: 1,
    wrongAnswerCount: 0,
    questionCount: 1,
    score: 100,
    receivedAt: "2026-10-18T00:01:00.000Z",
    clientSubmittedAt: body.clientSubmittedAt,
  } as const;
  await queue.sync(
    "alice",
    async (submission) => {
      sent.push(submission);
      return result;
    },
    () => true,
    10000,
  );
  await queue.sync(
    "alice",
    async () => {
      throw new Error("Must not send a synced operation");
    },
    () => true,
    20000,
  );
  expect(sent).toEqual([body, body]);
  expect((await queue.list("alice"))[0]).toMatchObject({ state: "synced", result });
});
it("recovers an interrupted synchronization lease without letting a late response overwrite it", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  let started!: () => void;
  let finish!: (result: OfflineSyncResult) => void;
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const first = queue.sync(
    "alice",
    async () => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    () => true,
    1000,
  );
  await waiting;
  let calls = 0;
  const result = {
    state: "synced",
    clientAttemptId: body.clientAttemptId,
    attemptId: "server-id",
    learningCycle: 1,
    correctAnswerCount: 0,
    wrongAnswerCount: 1,
    questionCount: 1,
    score: 0,
    receivedAt: body.clientSubmittedAt,
    clientSubmittedAt: body.clientSubmittedAt,
  } as const;
  await queue.sync(
    "alice",
    async () => {
      calls++;
      return result;
    },
    () => true,
    2000,
  );
  expect(calls).toBe(0);
  await queue.sync(
    "alice",
    async () => {
      calls++;
      return result;
    },
    () => true,
    32000,
  );
  finish({ ...result, score: 100 });
  await first;
  expect(calls).toBe(1);
  expect((await queue.list("alice"))[0].result?.score).toBe(0);
});
it("retains a conflict for review and never retries it automatically", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  let calls = 0;
  const conflict = async () => {
    calls++;
    throw { response: { status: 409 } };
  };
  await queue.sync("alice", conflict, () => true, 1000);
  await queue.sync("alice", conflict, () => true, 100000);
  expect(calls).toBe(1);
  expect((await queue.list("alice"))[0]).toMatchObject({
    state: "failed",
    body,
    error: "offlineRecovery.changed",
  });
});
it("does not resurrect explicitly purged attempts from a late acknowledgement", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  let started!: () => void;
  let finish!: (result: OfflineSyncResult) => void;
  let owner = "alice";
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const sending = queue.sync(
    "alice",
    async () => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    () => owner === "alice",
    1000,
  );
  await waiting;
  owner = "bob";
  await storage.purgeOwner("alice");
  finish({
    clientAttemptId: body.clientAttemptId,
    state: "synced",
    attemptId: "server-id",
    learningCycle: 1,
    correctAnswerCount: 1,
    wrongAnswerCount: 0,
    questionCount: 1,
    score: 100,
    receivedAt: body.clientSubmittedAt,
    clientSubmittedAt: body.clientSubmittedAt,
  });
  await sending;
  expect(await queue.list("alice")).toEqual([]);
});
it("does not accept an acknowledgement belonging to another attempt", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  await queue.sync(
    "alice",
    async () => ({
      state: "synced",
      clientAttemptId: "another-id",
      attemptId: "server-id",
      learningCycle: 1,
      score: 100,
      correctAnswerCount: 1,
      wrongAnswerCount: 0,
      questionCount: 1,
      receivedAt: body.clientSubmittedAt,
      clientSubmittedAt: body.clientSubmittedAt,
    }),
    () => true,
    1000,
  );
  expect((await queue.list("alice"))[0].state).toBe("pending");
  expect((await queue.list("alice"))[0].result).toBeUndefined();
});

it("retains expired authentication and retries the same immutable UUID only on explicit recovery", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  await queue.sync(
    "alice",
    async () => {
      throw { response: { status: 401 } };
    },
    () => true,
    1000,
  );
  expect((await queue.list("alice"))[0]).toMatchObject({
    state: "failed",
    failureStatus: 401,
    error: "offlineRecovery.authRequired",
    body,
  });
  await queue.sync(
    "alice",
    async () => {
      throw new Error("must not retry automatically");
    },
    () => true,
    2000,
  );
  expect(await queue.retry("bob", body.clientAttemptId)).toBe(false);
  expect(await queue.retry("alice", body.clientAttemptId, 3000)).toBe(true);
  expect((await queue.list("alice"))[0]).toMatchObject({
    state: "pending",
    id: body.clientAttemptId,
    body,
  });
});
it("archives a rejected snapshot without deleting answers and permits a separate new attempt", async () => {
  await queue.enqueue("alice", "course", "lesson", 1, body);
  await queue.sync(
    "alice",
    async () => {
      throw { response: { status: 409 } };
    },
    () => true,
    1000,
  );
  expect(await queue.archive("alice", body.clientAttemptId, 2000)).toBe(true);
  const next = { ...body, clientAttemptId: crypto.randomUUID(), snapshot: "new signed snapshot" };
  await queue.enqueue("alice", "course", "lesson", 1, next);
  storage.close();
  storage = new OfflineStorage(storage.name);
  queue = new OfflineQueue(storage);
  const records = await queue.list("alice");
  expect(records).toHaveLength(2);
  expect(records.find((x) => x.id === body.clientAttemptId)).toMatchObject({
    archivedAt: 2000,
    body,
  });
  expect(await queue.retry("alice", body.clientAttemptId, 3000)).toBe(false);
  let count = 0;
  await queue.sync(
    "alice",
    async () => {
      count++;
      throw { response: { status: 403 } };
    },
    () => true,
    3000,
  );
  expect(count).toBe(1);
  expect((await queue.list("alice")).find((x) => x.id === next.clientAttemptId)).toMatchObject({
    error: "offlineRecovery.forbidden",
    failureStatus: 403,
  });
});

it("preserves original question wording for review independently of a later course download", async () => {
  const review = {
    title: "Original assessment",
    language: "pt-AO" as const,
    questions: [
      {
        id: "question",
        title: "Original question",
        prompt: "Original prompt",
        options: [{ id: "option", label: "Original answer" }],
      },
    ],
  };
  await queue.enqueue("alice", "course", "lesson", 1, body, review);
  await queue.sync(
    "alice",
    async () => {
      throw { response: { status: 409 } };
    },
    () => true,
    1000,
  );
  await queue.archive("alice", body.clientAttemptId, 2000);
  storage.close();
  storage = new OfflineStorage(storage.name);
  queue = new OfflineQueue(storage);
  expect((await queue.list("alice"))[0]).toMatchObject({ body, review });
});
