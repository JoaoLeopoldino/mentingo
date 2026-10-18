import "fake-indexeddb/auto";
import { PERMISSIONS } from "@repo/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "~/modules/Auth/authStore";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";

import {
  getOfflineOwner,
  observeOfflineSession,
  suspendOfflineSession,
  clearOfflineSuspension,
} from "./offline-session";
import { offlineStorage } from "./offline-storage";

import type { CurrentUserResponse } from "~/api/generated-api";

const user = (id: string, isSupportMode = false) =>
  ({ id, isSupportMode, permissions: [PERMISSIONS.USER_READ_SELF] }) as CurrentUserResponse["data"];
let stop: (() => void) | undefined;
afterEach(async () => {
  stop?.();
  clearOfflineSuspension();
  useAuthStore.setState({ isLoggedIn: false });
  useCurrentUserStore.setState({ currentUser: undefined });
  await offlineStorage.courses.clear();
  await offlineStorage.operations.clear();
});
describe("offline owner session", () => {
  it("denies anonymous and support sessions", () => {
    useCurrentUserStore.setState({ currentUser: user("alice") });
    expect(getOfflineOwner()).toBeUndefined();
    useAuthStore.setState({ isLoggedIn: true });
    expect(getOfflineOwner()).toContain(":alice");
    useCurrentUserStore.setState({ currentUser: user("alice", true) });
    expect(getOfflineOwner()).toBeUndefined();
  });
  it("purges private snapshots when the account changes", async () => {
    useAuthStore.setState({ isLoggedIn: true });
    useCurrentUserStore.setState({ currentUser: user("alice") });
    const owner = getOfflineOwner()!;
    stop = observeOfflineSession();
    await offlineStorage.download(owner, "course", "pt-AO", async () => ({
      title: "Private",
      lessons: [],
      unavailable: [],
    }));
    useCurrentUserStore.setState({ currentUser: user("bob") });
    await vi.waitFor(async () => expect(await offlineStorage.list(owner)).toEqual([]));
  });
  it("hides and purges content when another tab signs out", async () => {
    useAuthStore.setState({ isLoggedIn: true });
    useCurrentUserStore.setState({ currentUser: user("alice") });
    const owner = getOfflineOwner()!;
    stop = observeOfflineSession();
    await offlineStorage.download(owner, "course", "pt-AO", async () => ({
      title: "Private",
      lessons: [],
      unavailable: [],
    }));
    localStorage.setItem("auth-storage", JSON.stringify({ state: { isLoggedIn: false } }));
    window.dispatchEvent(new StorageEvent("storage", { key: "auth-storage" }));
    expect(getOfflineOwner()).toBeUndefined();
    await vi.waitFor(async () => expect(await offlineStorage.list(owner)).toEqual([]));
  });
});

it("locks expired authentication without deleting pending answers; same user can recover", async () => {
  useAuthStore.setState({ isLoggedIn: true });
  useCurrentUserStore.setState({ currentUser: user("alice") });
  const owner = getOfflineOwner()!;
  stop = observeOfflineSession();
  await offlineStorage.operations.put({
    owner,
    id: "retained",
    courseId: "course",
    lessonId: "lesson",
    learningCycle: 1,
    state: "pending",
    tries: 0,
    nextRetryAt: 0,
    body: {
      clientAttemptId: "retained",
      snapshot: "signed",
      clientSubmittedAt: "2026-10-18T00:00:00.000Z",
      answers: [],
    },
  });
  suspendOfflineSession();
  useAuthStore.setState({ isLoggedIn: false });
  useCurrentUserStore.setState({ currentUser: undefined });
  expect(getOfflineOwner()).toBeUndefined();
  expect(await offlineStorage.operations.get([owner, "retained"])).toBeTruthy();
  useAuthStore.setState({ isLoggedIn: true });
  useCurrentUserStore.setState({ currentUser: user("alice") });
  expect(getOfflineOwner()).toBe(owner);
  expect(await offlineStorage.operations.get([owner, "retained"])).toBeTruthy();
  await offlineStorage.operations.clear();
});
