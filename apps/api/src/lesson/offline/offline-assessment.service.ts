import { createHash } from "node:crypto";

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ASSESSMENT_QUESTION_TYPES,
  ASSESSMENT_ATTEMPT_LIMIT_MODES,
  ASSESSMENT_GRADING_MODES,
} from "@repo/shared";

import { canTrackLessonProgress } from "src/common/utils/lessonLearningAccess";
import { QuizAuthoringService } from "src/quiz/services/quiz-authoring.service";

import { LessonService } from "../services/lesson.service";

import { OfflineAssessmentRepository } from "./offline-assessment.repository";
import {
  offlineDefinitionHash,
  signOfflineSnapshot,
  verifyOfflineSnapshot,
} from "./snapshot-token";

import type {
  OfflineAssessmentSyncBody,
  OfflineSnapshotResponse,
} from "./offline-assessment.schema";
import type { OfflineAssessmentResult, OfflineSnapshotClaims } from "./offline-assessment.types";
import type { SupportedLanguages } from "@repo/shared";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class OfflineAssessmentService {
  constructor(
    private readonly offlineAssessmentRepository: OfflineAssessmentRepository,
    private readonly quizAuthoringService: QuizAuthoringService,
    private readonly lessonService: LessonService,
  ) {}
  private signingKey() {
    const key = Buffer.from(process.env.MASTER_KEY ?? "", "base64");
    if (key.length !== 32) throw new ServiceUnavailableException("offlineQuiz.error.signingKey");
    return key;
  }
  private async definition(lessonId: UUIDType, language: SupportedLanguages) {
    const definition = await this.quizAuthoringService.getQuizLessonForAuthoring(
      lessonId,
      language,
    );
    if (!definition) throw new NotFoundException("common.toast.notFound");
    if (!definition.assessment.availableLocales.includes(language))
      throw new ConflictException("offlineQuiz.error.language");
    if (
      definition.assessment.attemptLimitMode !== ASSESSMENT_ATTEMPT_LIMIT_MODES.NONE ||
      definition.assessment.maximumAttempts ||
      definition.assessment.attemptCooldown ||
      !definition.questions.length ||
      definition.questions.length > 100 ||
      definition.questions.some(
        (question) =>
          question.questionType !== ASSESSMENT_QUESTION_TYPES.SINGLE_CHOICE ||
          question.gradingMode !== ASSESSMENT_GRADING_MODES.AUTOMATIC ||
          question.photoS3Key,
      )
    ) {
      throw new ConflictException("offlineQuiz.error.unsupported");
    }
    return definition;
  }
  async snapshot(
    lessonId: UUIDType,
    language: SupportedLanguages,
    actor: CurrentUserType,
  ): Promise<OfflineSnapshotResponse> {
    if (actor.isSupportMode) throw new ForbiddenException("offlineQuiz.error.subject");
    return this.offlineAssessmentRepository.transaction(async (trx) => {
      const context = await this.offlineAssessmentRepository.lockContext(actor, lessonId, trx);
      if (!context) throw new NotFoundException("common.toast.notFound");
      if (
        !canTrackLessonProgress(actor.permissions, {
          hasEnrollment: true,
          isCourseAuthor: context.authorId === actor.userId,
          isLearningModeActive: context.isLearningMode,
        })
      )
        throw new ForbiddenException("offlineQuiz.error.subject");
      if (context.completedAt) throw new ConflictException("offlineQuiz.error.completed");
      // Keep native access/sequence validation and the existing lesson-start workflow.
      await this.lessonService.getLessonById(lessonId, actor.userId, actor, language);
      const definition = await this.definition(lessonId, language);
      const key = this.signingKey();
      const issuedAt = Date.now();
      const expiresAt = issuedAt + 7 * 24 * 60 * 60 * 1000;
      const snapshot = signOfflineSnapshot(
        {
          version: 1,
          tenantId: actor.tenantId,
          learnerId: actor.userId,
          courseId: context.courseId,
          lessonId,
          language,
          learningCycle: context.learningCycle,
          definitionHash: offlineDefinitionHash(definition, key),
          issuedAt,
          expiresAt,
        },
        key,
      );
      return {
        snapshot,
        lessonId,
        courseId: context.courseId,
        language,
        title: definition.lesson.title,
        learningCycle: context.learningCycle,
        expiresAt: new Date(expiresAt).toISOString(),
        questions: definition.questions.map((question) => ({
          id: question.id,
          title: question.title,
          prompt: question.prompt,
          options: question.options.map((option) => ({ id: option.id, label: option.label })),
        })),
      };
    });
  }
  async sync(
    body: OfflineAssessmentSyncBody,
    actor: CurrentUserType,
  ): Promise<OfflineAssessmentResult> {
    if (actor.isSupportMode) throw new ForbiddenException("offlineQuiz.error.subject");
    const receivedAt = new Date().toISOString();
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          snapshot: body.snapshot,
          clientSubmittedAt: body.clientSubmittedAt,
          answers: [...body.answers].sort((a, b) => a.questionId.localeCompare(b.questionId)),
        }),
      )
      .digest("hex");
    return this.offlineAssessmentRepository.transaction(async (trx) => {
      const cached = await this.offlineAssessmentRepository.findReceipt(
        actor,
        body.clientAttemptId,
        trx,
      );
      if (cached) {
        if (cached.hash !== hash || !cached.result)
          throw new ConflictException("offlineQuiz.error.idempotency");
        return cached.result;
      }
      const key = this.signingKey();
      let claims: OfflineSnapshotClaims;
      try {
        claims = verifyOfflineSnapshot(body.snapshot, key);
      } catch (error) {
        throw new ConflictException(
          error instanceof Error ? error.message : "offlineQuiz.error.snapshot",
        );
      }
      if (claims.tenantId !== actor.tenantId || claims.learnerId !== actor.userId)
        throw new ForbiddenException("offlineQuiz.error.subject");
      await this.offlineAssessmentRepository.lockContext(actor, claims.lessonId, trx);
      // A concurrent retry may have committed while this request waited for the enrollment lock.
      const afterLock = await this.offlineAssessmentRepository.findReceipt(
        actor,
        body.clientAttemptId,
        trx,
      );
      if (afterLock) {
        if (afterLock.hash !== hash || !afterLock.result)
          throw new ConflictException("offlineQuiz.error.idempotency");
        return afterLock.result;
      }
      const context = await this.offlineAssessmentRepository.lockContext(
        actor,
        claims.lessonId,
        trx,
      );
      if (!context || context.courseId !== claims.courseId)
        throw new NotFoundException("common.toast.notFound");
      if (context.learningCycle !== claims.learningCycle)
        throw new ConflictException("offlineQuiz.error.cycle");
      if (
        !canTrackLessonProgress(actor.permissions, {
          hasEnrollment: true,
          isCourseAuthor: context.authorId === actor.userId,
          isLearningModeActive: context.isLearningMode,
        })
      )
        throw new ForbiddenException("offlineQuiz.error.subject");
      if (context.completedAt) throw new ConflictException("offlineQuiz.error.completed");
      const definition = await this.definition(claims.lessonId, claims.language);
      if (offlineDefinitionHash(definition, key) !== claims.definitionHash)
        throw new ConflictException("offlineQuiz.error.changed");
      if (
        body.answers.length !== definition.questions.length ||
        new Set(body.answers.map((answer) => answer.questionId)).size !== body.answers.length ||
        body.answers.some(
          (answer) =>
            !definition.questions.some(
              (question) =>
                question.id === answer.questionId &&
                question.options.some((option) => option.id === answer.optionId),
            ),
        )
      )
        throw new ConflictException("offlineQuiz.error.answers");
      // TenantDbRunner composes this native transaction inside the enclosing one.
      const graded = await this.lessonService.evaluationQuiz(
        {
          lessonId: claims.lessonId,
          language: claims.language,
          questionsAnswers: body.answers.map((answer) => ({
            questionId: answer.questionId,
            answers: [{ answerId: answer.optionId }],
          })),
        },
        actor,
      );
      const currentDefinition = await this.definition(claims.lessonId, claims.language);
      if (offlineDefinitionHash(currentDefinition, key) !== claims.definitionHash)
        throw new ConflictException("offlineQuiz.error.changed");
      const attempt = await this.offlineAssessmentRepository.findLatestAttempt(
        actor,
        definition.assessment.id,
        context.learningCycle,
        trx,
      );
      if (!attempt) throw new ConflictException("offlineQuiz.error.attempt");
      const result: OfflineAssessmentResult = {
        ...graded,
        state: "synced",
        clientAttemptId: body.clientAttemptId,
        attemptId: attempt.id,
        learningCycle: context.learningCycle,
        receivedAt,
        clientSubmittedAt: body.clientSubmittedAt,
      };
      await this.offlineAssessmentRepository.saveReceipt(actor, result, hash, trx);
      return result;
    });
  }
}
