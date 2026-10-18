import { randomUUID } from "node:crypto";

import { SUPPORTED_LANGUAGES } from "@repo/shared";

import { signOfflineSnapshot, verifyOfflineSnapshot } from "./snapshot-token";

import type { OfflineSnapshotClaims } from "./offline-assessment.types";

const key = Buffer.alloc(32, 7);
const now = Date.parse("2026-10-18T00:00:00Z");
const claims: OfflineSnapshotClaims = {
  version: 1,
  tenantId: randomUUID(),
  learnerId: randomUUID(),
  courseId: randomUUID(),
  lessonId: randomUUID(),
  language: SUPPORTED_LANGUAGES.PT_AO,
  learningCycle: 2,
  definitionHash: "opaque-definition-hmac",
  issuedAt: now,
  expiresAt: now + 60_000,
};
describe("offline assessment snapshot signatures", () => {
  it("round trips signed claims without using authentication JWTs", () => {
    expect(verifyOfflineSnapshot(signOfflineSnapshot(claims, key), key, now)).toEqual(claims);
  });
  it("rejects modified claims and signatures", () => {
    const token = signOfflineSnapshot(claims, key);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, learningCycle: 99 })).toString(
      "base64url",
    );
    expect(() => verifyOfflineSnapshot(`${forged}.${signature}`, key, now)).toThrow();
    expect(() => verifyOfflineSnapshot(`${token}x`, key, now)).toThrow();
  });
  it("rejects expired snapshots and rotated keys", () => {
    const token = signOfflineSnapshot(claims, key);
    expect(() => verifyOfflineSnapshot(token, key, now + 60_000)).toThrow(
      "offlineQuiz.error.expired",
    );
    expect(() => verifyOfflineSnapshot(token, Buffer.alloc(32, 8), now)).toThrow();
  });
  it("rejects malformed tokens and short signing keys", () => {
    for (const token of ["", "a.b.c", "not-base64.invalid", "{}.x"])
      expect(() => verifyOfflineSnapshot(token, key, now)).toThrow();
    expect(() => signOfflineSnapshot(claims, Buffer.alloc(8))).toThrow(
      "offlineQuiz.error.signingKey",
    );
  });
});
