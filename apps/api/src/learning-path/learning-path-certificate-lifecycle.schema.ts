import { Type, type Static } from "@sinclair/typebox";

import { UUIDSchema } from "src/common";
const nullableDate = Type.Union([Type.String(), Type.Null()]);
export const pathCertificateDecisionSchema = Type.Object(
  { reason: Type.String({ minLength: 10, maxLength: 2000 }) },
  { additionalProperties: false },
);
export const renewPathCertificateSchema = Type.Object(
  {
    ...pathCertificateDecisionSchema.properties,
    expiresAt: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])),
  },
  { additionalProperties: false },
);
export const pathCertificateLifecycleSchema = Type.Object({
  id: UUIDSchema,
  status: Type.String(),
  issuedAt: Type.String(),
  expiresAt: nullableDate,
  revokedAt: nullableDate,
  revokedBy: Type.Union([UUIDSchema, Type.Null()]),
  revocationReason: Type.Union([Type.String(), Type.Null()]),
  replacesCertificateId: Type.Union([UUIDSchema, Type.Null()]),
  renewalReason: Type.Union([Type.String(), Type.Null()]),
  issuedBy: Type.Union([UUIDSchema, Type.Null()]),
  completionSnapshot: Type.Array(
    Type.Object({ courseId: UUIDSchema, learningCycle: Type.Number(), completedAt: nullableDate }),
  ),
});
export const pathCertificateHistorySchema = Type.Array(pathCertificateLifecycleSchema);
export type PathCertificateDecision = Static<typeof pathCertificateDecisionSchema>;
export type RenewPathCertificate = Static<typeof renewPathCertificateSchema>;
export type PathCertificateLifecycle = Static<typeof pathCertificateLifecycleSchema>;
export type PathCertificateHistory = Static<typeof pathCertificateHistorySchema>;
