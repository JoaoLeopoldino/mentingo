import "fake-indexeddb/auto";
import { SUPPORTED_LANGUAGES } from "@repo/shared";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OfflineStorage, OFFLINE_MAX_BYTES } from "./offline-storage";

import type { OfflinePayload } from "./offline.types";

const language = SUPPORTED_LANGUAGES.PT_AO;
const payload: OfflinePayload = {
  title: "Segurança no trabalho",
  lessons: [{ id: "lesson", title: "Protecção", html: "<p>Capacete obrigatório.</p>", pdfs: [] }],
  unavailable: [{ title: "Avaliação", type: "quiz" }],
};
let storage: OfflineStorage;
beforeEach(() => {
  storage = new OfflineStorage(`offline-test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await storage.delete();
});
describe("private offline downloads", () => {
  it("persists content across reopening and isolates owners", async () => {
    await storage.download("origin:alice", "course", language, async () => payload);
    const name = storage.name;
    storage.close();
    storage = new OfflineStorage(name);
    expect((await storage.list("origin:alice"))[0].payload).toEqual(payload);
    expect(await storage.list("origin:bob")).toEqual([]);
  });
  it("never publishes partial content after interruption and allows retry", async () => {
    await expect(
      storage.download("alice", "course", language, async () => {
        throw new TypeError("Network offline");
      }),
    ).rejects.toThrow("Network offline");
    expect((await storage.list("alice"))[0].state).toBe("failed");
    expect((await storage.list("alice"))[0].payload).toBeUndefined();
    await storage.download("alice", "course", language, async () => payload);
    expect((await storage.list("alice"))[0].state).toBe("ready");
  });
  it("cannot resurrect content after removal during download", async () => {
    let finish!: (value: OfflinePayload) => void;
    let started!: () => void;
    const waiting = new Promise<void>((resolve) => {
      started = resolve;
    });
    const download = storage.download("alice", "course", language, () => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    await waiting;
    await storage.purgeOwner("alice");
    finish(payload);
    await expect(download).rejects.toThrow("offline.error.cancelled");
    expect(await storage.list("alice")).toEqual([]);
  });
  it("rejects oversized payloads without publishing a snapshot", async () => {
    const large = {
      ...payload,
      lessons: [
        {
          ...payload.lessons[0],
          pdfs: [{ id: "pdf", title: "Large PDF", bytes: new Uint8Array(OFFLINE_MAX_BYTES + 1) }],
        },
      ],
    };
    await expect(storage.download("alice", "course", language, async () => large)).rejects.toThrow(
      "offline.error.quota",
    );
    expect((await storage.list("alice"))[0].state).toBe("failed");
  });
  it("expires content and persists explicit removal", async () => {
    await storage.download("alice", "course", language, async () => payload, 100);
    expect(await storage.list("alice", 100 + 8 * 24 * 60 * 60 * 1000)).toEqual([]);
    await storage.download("alice", "course", language, async () => payload);
    await storage.remove("alice", "course", language);
    expect(await storage.list("alice")).toEqual([]);
  });
});

it("upgrades existing version-one private downloads without losing their contents", async () => {
  const legacy = new Dexie(storage.name);
  legacy.version(1).stores({ courses: "[owner+courseId+language],owner,expiresAt" });
  await legacy.table("courses").put({
    owner: "alice",
    courseId: "course",
    language,
    token: "legacy-token",
    state: "ready",
    downloadedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    bytes: 100,
    payload,
  });
  legacy.close();
  expect((await storage.list("alice"))[0].payload).toEqual(payload);
  expect(await storage.operations.count()).toBe(0);
});
