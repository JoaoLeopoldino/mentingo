import { randomUUID } from "node:crypto";

import { COURSE_ENROLLMENT, SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { and, eq } from "drizzle-orm";
import request from "supertest";

import { OfflineAssessmentRepository } from "src/lesson/offline/offline-assessment.repository";
import { DEFAULT_STUDENT_SETTINGS } from "src/settings/constants/settings.constants";
import {
  assessmentAttempts,
  assessmentQuestionChoiceOptions,
  settings,
  tenants,
  studentCourses,
  studentLessonProgress,
} from "src/storage/schema";
import { settingsToJSONBuildObject } from "src/utils/settings-to-json-build-object";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createCategoryFactory } from "../../../test/factory/category.factory";
import { createChapterFactory } from "../../../test/factory/chapter.factory";
import { createCourseFactory } from "../../../test/factory/course.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory } from "../../../test/factory/user.factory";
import { DEFAULT_E2E_GLOBAL_SETTINGS } from "../../../test/helpers/e2e-settings";
import { createNativeQuizFixture } from "../../../test/helpers/native-quiz-fixture";
import { cookieFor, truncateTables } from "../../../test/helpers/test-helpers";

import type { INestApplication } from "@nestjs/common";
import type { DatabasePg, UUIDType } from "src/common";

describe("Offline assessments with tenant transactions (e2e)", () => {
  let app: INestApplication;
  let db: DatabasePg;
  let baseDb: DatabasePg;
  let categoryFactory: ReturnType<typeof createCategoryFactory>;
  let chapterFactory: ReturnType<typeof createChapterFactory>;
  let courseFactory: ReturnType<typeof createCourseFactory>;
  let userFactory: ReturnType<typeof createUserFactory>;
  const password = "password123";
  beforeAll(async () => {
    const context = await createE2ETest({ useDbProxy: true });
    app = context.app;
    db = context.db;
    baseDb = context.dbAdmin;
    categoryFactory = createCategoryFactory(db);
    chapterFactory = createChapterFactory(db);
    courseFactory = createCourseFactory(db);
    userFactory = createUserFactory(db);
  });
  beforeEach(async () => {
    await createSettingsFactory(db).create();
  });
  afterEach(async () => {
    // TRUNCATE performs durable filesystem syncs; allow slow local Docker storage to finish before the next fixture.
    await truncateTables(baseDb, [
      "assessment_attempts",
      "courses",
      "users",
      "categories",
      "settings",
    ]);
  }, 120000);
  afterAll(async () => {
    await app.close();
  });
  const enrollStudentToCourse = async (studentId: UUIDType, courseId: UUIDType) => {
    await db
      .insert(studentCourses)
      .values({
        studentId,
        courseId,
        status: COURSE_ENROLLMENT.ENROLLED,
        enrolledAt: new Date().toISOString(),
      });
  };
  describe("offline assessment synchronization", () => {
    const setupOfflineQuiz = async () => {
      const category = await categoryFactory.create();
      const author = await userFactory.create({ role: SYSTEM_ROLE_SLUGS.CONTENT_CREATOR });
      const student = await userFactory
        .withCredentials({ password })
        .withUserSettings(db)
        .create({ role: SYSTEM_ROLE_SLUGS.STUDENT });
      const course = await courseFactory.create({
        authorId: author.id,
        categoryId: category.id,
        status: "published",
        settings: { lessonSequenceEnabled: false },
      });
      const chapter = await chapterFactory.create({ courseId: course.id });
      await enrollStudentToCourse(student.id, course.id);
      const quiz = await createNativeQuizFixture(db, chapter.id);
      const cookies = await cookieFor(student, app);
      const snapshot = await request(app.getHttpServer())
        .get(`/api/offline-assessments/${quiz.lesson.id}/snapshot`)
        .query({ language: "en" })
        .set("Cookie", cookies)
        .expect(200);
      const submission = {
        clientAttemptId: randomUUID(),
        snapshot: snapshot.body.data.snapshot,
        clientSubmittedAt: new Date(Date.now() - 3600000).toISOString(),
        answers: [{ questionId: quiz.question.id, optionId: quiz.correctOption.id }],
      };
      return { ...quiz, course, student, cookies, snapshot: snapshot.body.data, submission };
    };
    it("delivers a signed snapshot without answer keys", async () => {
      const fixture = await setupOfflineQuiz();
      expect(fixture.snapshot.learningCycle).toBe(1);
      expect(fixture.snapshot.questions).toHaveLength(1);
      expect(JSON.stringify(fixture.snapshot)).not.toContain("isCorrect");
      expect(JSON.stringify(fixture.snapshot)).not.toContain("solutionExplanation");
    });
    it("grades on the server and preserves client time separately from submission time", async () => {
      const fixture = await setupOfflineQuiz();
      const response = await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", fixture.cookies)
        .send(fixture.submission)
        .expect(200);
      expect(response.body.data).toMatchObject({
        clientAttemptId: fixture.submission.clientAttemptId,
        score: 100,
        questionCount: 1,
        learningCycle: 1,
        clientSubmittedAt: fixture.submission.clientSubmittedAt,
      });
      const attempts = await db
        .select()
        .from(assessmentAttempts)
        .where(eq(assessmentAttempts.learnerId, fixture.student.id));
      expect(attempts).toHaveLength(1);
      expect(attempts[0].offlineClientAttemptId).toBe(fixture.submission.clientAttemptId);
      expect(Date.parse(attempts[0].submittedAt)).toBeGreaterThan(
        Date.parse(fixture.submission.clientSubmittedAt),
      );
    });
    it("rolls back grading and completion if the durable receipt cannot be saved", async () => {
      const fixture = await setupOfflineQuiz();
      const receipt = jest
        .spyOn(app.get(OfflineAssessmentRepository), "saveReceipt")
        .mockRejectedValueOnce(new Error("Synthetic receipt persistence failure"));
      try {
        await request(app.getHttpServer())
          .post("/api/offline-assessments/sync")
          .set("Cookie", fixture.cookies)
          .send(fixture.submission)
          .expect(500);
      } finally {
        receipt.mockRestore();
      }
      expect(await db.select().from(assessmentAttempts)).toHaveLength(0);
      const [progress] = await db
        .select()
        .from(studentLessonProgress)
        .where(
          and(
            eq(studentLessonProgress.studentId, fixture.student.id),
            eq(studentLessonProgress.lessonId, fixture.lesson.id),
          ),
        );
      expect(progress?.completedAt ?? null).toBeNull();
    });
    it("retries concurrent submissions without creating duplicate attempts", async () => {
      const fixture = await setupOfflineQuiz();
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          request(app.getHttpServer())
            .post("/api/offline-assessments/sync")
            .set("Cookie", fixture.cookies)
            .send(fixture.submission),
        ),
      );
      expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
      expect(new Set(responses.map((response) => response.body.data.attemptId)).size).toBe(1);
      expect(
        await db
          .select()
          .from(assessmentAttempts)
          .where(eq(assessmentAttempts.learnerId, fixture.student.id)),
      ).toHaveLength(1);
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", fixture.cookies)
        .send({ ...fixture.submission, clientSubmittedAt: new Date().toISOString() })
        .expect(409);
    });
    it("rejects a snapshot owned by another learner", async () => {
      const fixture = await setupOfflineQuiz();
      const other = await userFactory
        .withCredentials({ password })
        .withUserSettings(db)
        .create({ role: SYSTEM_ROLE_SLUGS.STUDENT });
      const cookies = await cookieFor(other, app);
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", cookies)
        .send(fixture.submission)
        .expect(403);
      expect(await db.select().from(assessmentAttempts)).toHaveLength(0);
    });
    it("rejects a snapshot submitted from another tenant under RLS", async () => {
      const fixture = await setupOfflineQuiz();
      const host = `https://offline-${randomUUID()}.invalid`;
      const [tenant] = await baseDb
        .insert(tenants)
        .values({ name: "Synthetic isolated tenant", host })
        .returning();
      const other = await createUserFactory(baseDb)
        .withCredentials({ password })
        .create({ role: SYSTEM_ROLE_SLUGS.STUDENT, tenantId: tenant.id });
      await baseDb.insert(settings).values([
        {
          userId: null,
          tenantId: tenant.id,
          settings: settingsToJSONBuildObject(DEFAULT_E2E_GLOBAL_SETTINGS),
        },
        {
          userId: other.id,
          tenantId: tenant.id,
          settings: settingsToJSONBuildObject(DEFAULT_STUDENT_SETTINGS),
        },
      ]);
      const cookies = await cookieFor(other, app, host);
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Referer", `${host}/`)
        .set("Cookie", cookies)
        .send(fixture.submission)
        .expect(403);
      expect(await baseDb.select().from(assessmentAttempts)).toHaveLength(0);
    });
    it("rejects content changed after download", async () => {
      const fixture = await setupOfflineQuiz();
      await db
        .update(assessmentQuestionChoiceOptions)
        .set({ label: "Updated answer" })
        .where(eq(assessmentQuestionChoiceOptions.id, fixture.correctOption.id));
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", fixture.cookies)
        .send(fixture.submission)
        .expect(409);
      expect(await db.select().from(assessmentAttempts)).toHaveLength(0);
    });
    it("rejects a previous learning cycle without consuming the attempt", async () => {
      const fixture = await setupOfflineQuiz();
      await db
        .update(studentCourses)
        .set({ learningCycle: 2 })
        .where(
          and(
            eq(studentCourses.studentId, fixture.student.id),
            eq(studentCourses.courseId, fixture.course.id),
          ),
        );
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", fixture.cookies)
        .send(fixture.submission)
        .expect(409);
      expect(await db.select().from(assessmentAttempts)).toHaveLength(0);
    });
    it("rejects client-supplied scores", async () => {
      const fixture = await setupOfflineQuiz();
      await request(app.getHttpServer())
        .post("/api/offline-assessments/sync")
        .set("Cookie", fixture.cookies)
        .send({ ...fixture.submission, score: 100 })
        .expect(400);
      expect(await db.select().from(assessmentAttempts)).toHaveLength(0);
    });
  });
});
