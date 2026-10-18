import { NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { and, eq } from "drizzle-orm";

import { users } from "src/storage/schema";

import { getGroupManagerLearnerScopeCondition } from "./group-manager-scope.utils";
import { hasPermission } from "./permission.utils";

import type { DatabasePg, UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

/** Shared policy for course and learning-path certificate owners, independent of RLS configuration. */
export async function assertCanReadLearnerCertificates(
  db: DatabasePg,
  userId: UUIDType,
  actor: CurrentUserType,
): Promise<void> {
  if (userId === actor.userId) return;
  const learnerScope = getGroupManagerLearnerScopeCondition(actor, users.id, [
    PERMISSIONS.USER_MANAGE,
  ]);
  if (!hasPermission(actor.permissions, PERMISSIONS.USER_MANAGE) && !learnerScope)
    throw new NotFoundException("studentCertificateView.informations.certificateNotFound");
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, actor.tenantId), learnerScope))
    .limit(1);
  if (!target)
    throw new NotFoundException("studentCertificateView.informations.certificateNotFound");
}
