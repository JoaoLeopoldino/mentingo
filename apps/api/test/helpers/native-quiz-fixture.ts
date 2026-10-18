import {
  ASSESSMENT_QUESTION_TYPES,
  ASSESSMENT_GRADING_MODES,
  SUPPORTED_LANGUAGES,
} from "@repo/shared";
import { eq } from "drizzle-orm";

import { buildJsonbField } from "src/common/helpers/sqlHelpers";
import { LESSON_TYPES } from "src/lesson/lesson.type";
import {
  chapters,
  lessons,
  assessments,
  assessmentQuestions,
  assessmentQuestionChoiceOptions,
} from "src/storage/schema";

import type { DatabasePg, UUIDType } from "src/common";
export const createNativeQuizFixture = async (db: DatabasePg, chapterId: UUIDType) => {
  await db
    .update(chapters)
    .set({ lessonCount: 1, updatedAt: new Date().toISOString() })
    .where(eq(chapters.id, chapterId));

  const [lesson] = await db
    .insert(lessons)
    .values({
      id: crypto.randomUUID(),
      chapterId,
      type: LESSON_TYPES.QUIZ,
      title: buildJsonbField("en", "Test Quiz Lesson"),
      description: buildJsonbField("en", "Test description"),
      thresholdScore: 70,
      displayOrder: 1,
      fileS3Key: null,
      fileType: null,
      isExternal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  const [assessment] = await db
    .insert(assessments)
    .values({
      id: crypto.randomUUID(),
      lessonId: lesson.id,
      passingScorePercentage: "70",
      baseLanguage: SUPPORTED_LANGUAGES.EN,
      availableLocales: [SUPPORTED_LANGUAGES.EN],
    })
    .returning();

  const [question1] = await db
    .insert(assessmentQuestions)
    .values({
      id: crypto.randomUUID(),
      assessmentId: assessment.id,
      questionType: ASSESSMENT_QUESTION_TYPES.SINGLE_CHOICE,
      gradingMode: ASSESSMENT_GRADING_MODES.AUTOMATIC,
      prompt: buildJsonbField("en", "What is 2+2?"),
      title: buildJsonbField("en", "What is 2+2?"),
      description: buildJsonbField("en", "Simple math question"),
      displayOrder: 1,
    })
    .returning();

  const options = await db
    .insert(assessmentQuestionChoiceOptions)
    .values([
      {
        id: crypto.randomUUID(),
        questionId: question1.id,
        language: SUPPORTED_LANGUAGES.EN,
        label: "3",
        isCorrect: false,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        questionId: question1.id,
        language: SUPPORTED_LANGUAGES.EN,
        label: "4",
        isCorrect: true,
        displayOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        questionId: question1.id,
        language: SUPPORTED_LANGUAGES.EN,
        label: "5",
        isCorrect: false,
        displayOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .returning();

  return { lesson, question: question1, correctOption: options[1] };
};
