import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { DatabasePg, type UUIDType } from "src/common";
import { DB } from "src/storage/db/db.providers";
import {
  assessmentAttempts,
  courseStudentMode,
  courses,
  chapters,
  lessons,
  studentCourses,
  studentLessonProgress,
} from "src/storage/schema";

import type { OfflineAssessmentResult } from "./offline-assessment.types";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class OfflineAssessmentRepository {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}
  async transaction<T>(work: (trx: DatabasePg) => Promise<T>): Promise<T> {
    for (let retry = 0; ; retry += 1) {
      try {
        return await this.db.transaction(work);
      } catch (error) {
        if ((error as { code?: string }).code !== "40001" || retry >= 2) throw error;
      }
    }
  }
  async findReceipt(actor: CurrentUserType, clientAttemptId: UUIDType, trx: DatabasePg) {
    const [row] = await trx
      .select({
        result: assessmentAttempts.offlineSyncResult,
        hash: assessmentAttempts.offlinePayloadHash,
      })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.tenantId, actor.tenantId),
          eq(assessmentAttempts.learnerId, actor.userId),
          eq(assessmentAttempts.offlineClientAttemptId, clientAttemptId),
        ),
      );
    return row;
  }
  async lockContext(actor: CurrentUserType, lessonId: UUIDType, trx: DatabasePg) {
    const [context] = await trx
      .select({
        courseId: courses.id,
        authorId: courses.authorId,
        learningCycle: studentCourses.learningCycle,
        isLearningMode: sql<boolean>`${courseStudentMode.id} IS NOT NULL`,
        completedAt: studentLessonProgress.completedAt,
      })
      .from(studentCourses)
      .innerJoin(courses, eq(courses.id, studentCourses.courseId))
      .innerJoin(chapters, eq(chapters.courseId, courses.id))
      .innerJoin(lessons, eq(lessons.chapterId, chapters.id))
      .leftJoin(
        courseStudentMode,
        and(eq(courseStudentMode.courseId, courses.id), eq(courseStudentMode.userId, actor.userId)),
      )
      .leftJoin(
        studentLessonProgress,
        and(
          eq(studentLessonProgress.lessonId, lessons.id),
          eq(studentLessonProgress.studentId, actor.userId),
        ),
      )
      .where(
        and(
          eq(studentCourses.tenantId, actor.tenantId),
          eq(studentCourses.studentId, actor.userId),
          eq(lessons.id, lessonId),
          inArray(courses.status, ["published", "private"]),
        ),
      )
      .for("update", { of: studentCourses });
    return context;
  }
  async findLatestAttempt(
    actor: CurrentUserType,
    assessmentId: UUIDType,
    learningCycle: number,
    trx: DatabasePg,
  ) {
    const [attempt] = await trx
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.tenantId, actor.tenantId),
          eq(assessmentAttempts.learnerId, actor.userId),
          eq(assessmentAttempts.assessmentId, assessmentId),
          eq(assessmentAttempts.learningCycle, learningCycle),
        ),
      )
      .orderBy(desc(assessmentAttempts.attemptNumber))
      .limit(1);
    return attempt;
  }
  async saveReceipt(
    actor: CurrentUserType,
    result: OfflineAssessmentResult,
    hash: string,
    trx: DatabasePg,
  ) {
    await trx
      .update(assessmentAttempts)
      .set({
        offlineClientAttemptId: result.clientAttemptId,
        offlinePayloadHash: hash,
        offlineClientSubmittedAt: result.clientSubmittedAt,
        offlineSyncResult: result,
      })
      .where(
        and(
          eq(assessmentAttempts.id, result.attemptId),
          eq(assessmentAttempts.tenantId, actor.tenantId),
          eq(assessmentAttempts.learnerId, actor.userId),
        ),
      );
  }
}
