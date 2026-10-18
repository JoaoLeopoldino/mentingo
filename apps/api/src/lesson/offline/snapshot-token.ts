import { createHmac, timingSafeEqual } from "node:crypto";

import type { OfflineSnapshotClaims } from "./offline-assessment.types";

function digest(value: string, key: Buffer, purpose: string) {
  if (key.length !== 32) throw new Error("offlineQuiz.error.signingKey");
  return createHmac("sha256", key)
    .update(`mentingo.offline-assessment.${purpose}.v1\0`)
    .update(value)
    .digest();
}
export function offlineDefinitionHash(definition: unknown, key: Buffer) {
  return digest(JSON.stringify(definition), key, "definition").toString("hex");
}
export function signOfflineSnapshot(claims: OfflineSnapshotClaims, key: Buffer) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${digest(payload, key, "snapshot").toString("base64url")}`;
}
export function verifyOfflineSnapshot(
  token: string,
  key: Buffer,
  now = Date.now(),
): OfflineSnapshotClaims {
  const parts = token.split(".");
  if (parts.length !== 2 || token.length > 16384) throw new Error("offlineQuiz.error.snapshot");
  const [payload, encodedSignature] = parts;
  const supplied = Buffer.from(encodedSignature, "base64url");
  const expected = digest(payload, key, "snapshot");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    throw new Error("offlineQuiz.error.snapshot");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as OfflineSnapshotClaims;
  if (
    claims.version !== 1 ||
    !Number.isFinite(claims.issuedAt) ||
    !Number.isFinite(claims.expiresAt) ||
    claims.expiresAt <= claims.issuedAt ||
    claims.expiresAt - claims.issuedAt > 7 * 24 * 60 * 60 * 1000
  )
    throw new Error("offlineQuiz.error.snapshot");
  if (now >= claims.expiresAt) throw new Error("offlineQuiz.error.expired");
  return claims;
}
