import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PERMISSIONS, LEARNING_PATH_CERTIFICATE_STATUSES, hasAllPermissions } from "@repo/shared";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { assertCanReadLearnerCertificates } from "src/common/permissions/assert-can-read-learner-certificates";
import { DB } from "src/storage/db/db.providers";
import {
  learningPathCertificates,
  learningPaths,
  learningPathCourses,
  studentCourses,
  users,
} from "src/storage/schema";

import type {
  RenewPathCertificate,
  PathCertificateHistory,
  PathCertificateLifecycle,
} from "../learning-path-certificate-lifecycle.schema";
import type { CurrentUserType } from "src/common/types/current-user.type";

/** Explicit administrative decisions. Does not reset shared course enrollments or erase attempts. */
@Injectable()
export class LearningPathCertificateLifecycleService {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}
  private authorize(actor: CurrentUserType, reason: string) {
    if (
      !hasAllPermissions(actor.permissions, [
        PERMISSIONS.LEARNING_PATH_UPDATE,
        PERMISSIONS.USER_MANAGE,
      ])
    )
      throw new ForbiddenException("competencies.errors.forbidden");
    if (reason.trim().length < 10)
      throw new BadRequestException("studentCertificateView.informations.revocationReasonRequired");
  }
  async history(
    userId: UUIDType,
    learningPathId: UUIDType,
    actor: CurrentUserType,
  ): Promise<PathCertificateHistory> {
    await assertCanReadLearnerCertificates(this.db, userId, actor);
    const rows = await this.db
      .select()
      .from(learningPathCertificates)
      .where(
        and(
          eq(learningPathCertificates.userId, userId),
          eq(learningPathCertificates.learningPathId, learningPathId),
          eq(learningPathCertificates.tenantId, actor.tenantId),
        ),
      )
      .orderBy(desc(learningPathCertificates.issuedAt), desc(learningPathCertificates.id));
    return rows.map((row) => this.record(row));
  }
  async snapshot(userId: UUIDType, pathId: UUIDType, db: DatabasePg = this.db) {
    return db
      .select({
        courseId: learningPathCourses.courseId,
        learningCycle: sql<number>`coalesce(${studentCourses.learningCycle},0)`,
        completedAt: studentCourses.completedAt,
      })
      .from(learningPathCourses)
      .leftJoin(
        studentCourses,
        and(
          eq(studentCourses.courseId, learningPathCourses.courseId),
          eq(studentCourses.studentId, userId),
        ),
      )
      .where(eq(learningPathCourses.learningPathId, pathId))
      .orderBy(learningPathCourses.courseId);
  }
  private record(row: typeof learningPathCertificates.$inferSelect): PathCertificateLifecycle {
    return {
      id: row.id,
      status: row.status,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      revokedBy: row.revokedBy,
      revocationReason: row.revocationReason,
      replacesCertificateId: row.replacesCertificateId,
      renewalReason: row.renewalReason,
      issuedBy: row.issuedBy,
      completionSnapshot: row.completionSnapshot,
    };
  }
  private async locked(db: DatabasePg, id: UUIDType, actor: CurrentUserType) {
    const [certificate] = await db
      .select()
      .from(learningPathCertificates)
      .where(
        and(
          eq(learningPathCertificates.id, id),
          eq(learningPathCertificates.tenantId, actor.tenantId),
        ),
      )
      .for("update");
    if (!certificate)
      throw new NotFoundException("studentCertificateView.informations.certificateNotFound");
    return certificate;
  }
  async revoke(
    id: UUIDType,
    reason: string,
    actor: CurrentUserType,
  ): Promise<PathCertificateLifecycle> {
    this.authorize(actor, reason);
    return this.db.transaction(async (trx) => {
      const certificate = await this.locked(trx, id, actor);
      if (certificate.revokedAt) {
        if (certificate.revocationReason !== reason.trim())
          throw new ConflictException("studentCertificateView.informations.certificateNotActive");
        return this.record(certificate);
      }
      const [row] = await trx
        .update(learningPathCertificates)
        .set({
          status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED,
          revokedAt: new Date().toISOString(),
          revokedBy: actor.userId,
          revocationReason: reason.trim(),
        })
        .where(eq(learningPathCertificates.id, id))
        .returning();
      return this.record(row);
    });
  }
  async renew(
    id: UUIDType,
    body: RenewPathCertificate,
    actor: CurrentUserType,
  ): Promise<PathCertificateLifecycle> {
    this.authorize(actor, body.reason);
    if (body.expiresAt && Date.parse(body.expiresAt) <= Date.now())
      throw new BadRequestException("studentCertificateView.informations.renewalExpiryInvalid");
    return this.db.transaction(async (trx) => {
      const certificate = await this.locked(trx, id, actor);
      const [replacement] = await trx
        .select()
        .from(learningPathCertificates)
        .where(eq(learningPathCertificates.replacesCertificateId, id));
      if (replacement) {
        if (
          replacement.renewalReason !== body.reason.trim() ||
          (replacement.expiresAt ? Date.parse(replacement.expiresAt) : null) !==
            (body.expiresAt ? Date.parse(body.expiresAt) : null)
        )
          throw new ConflictException("studentCertificateView.informations.certificateNotActive");
        return this.record(replacement);
      }
      const [recipient] = await trx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, certificate.userId),
            eq(users.tenantId, actor.tenantId),
            isNull(users.deletedAt),
          ),
        );
      if (!recipient)
        throw new NotFoundException("studentCertificateView.informations.certificateNotFound");
      const [path] = await trx
        .select()
        .from(learningPaths)
        .where(eq(learningPaths.id, certificate.learningPathId));
      if (!path?.includesCertificate)
        throw new BadRequestException("learningPaths.errors.certificateDisabled");
      // Lock each current enrollment in deterministic course order, shared with the native course-cycle reset.
      const courseIds = await trx
        .select({ id: learningPathCourses.courseId })
        .from(learningPathCourses)
        .where(eq(learningPathCourses.learningPathId, certificate.learningPathId))
        .orderBy(learningPathCourses.courseId);
      for (const course of courseIds)
        await trx
          .select({ id: studentCourses.id })
          .from(studentCourses)
          .where(
            and(
              eq(studentCourses.courseId, course.id),
              eq(studentCourses.studentId, certificate.userId),
            ),
          )
          .for("update");
      const current = await this.snapshot(certificate.userId, certificate.learningPathId, trx);
      const baseline = new Map(certificate.completionSnapshot.map((x) => [x.courseId, x]));
      const fresh =
        current.length > 0 &&
        current.every((row) => {
          const old = baseline.get(row.courseId);
          if (!row.completedAt || Date.parse(row.completedAt) <= Date.parse(certificate.issuedAt))
            return false;
          return !old || row.learningCycle > old.learningCycle;
        });
      if (!fresh)
        throw new ConflictException(
          "studentCertificateView.informations.renewalRequiresFreshCompletions",
        );
      await trx
        .update(learningPathCertificates)
        .set({ status: LEARNING_PATH_CERTIFICATE_STATUSES.EXPIRED })
        .where(eq(learningPathCertificates.id, id));
      const [row] = await trx
        .insert(learningPathCertificates)
        .values({
          userId: certificate.userId,
          learningPathId: certificate.learningPathId,
          tenantId: actor.tenantId,
          completionSnapshot: current,
          replacesCertificateId: id,
          renewalReason: body.reason.trim(),
          issuedBy: actor.userId,
          expiresAt: body.expiresAt ?? null,
        })
        .returning();
      return this.record(row);
    });
  }
}
