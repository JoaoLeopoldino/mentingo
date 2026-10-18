import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { LocalizationService } from "src/localization/localization.service";
import { DB } from "src/storage/db/db.providers";
import {
  competencies,
  competencyLevels,
  competencyJobRoles,
  competencyRequirements,
  competencyAssignments,
  competencyEvidence,
  competencyEvidenceReviews,
  competencyAssessments,
  competencyRevocations,
  users,
  groups,
  groupUsers,
  groupManagerGroups,
  courses,
  learningPaths,
} from "src/storage/schema";

import { hashCompetencyCommand } from "./competency-command";

import type {
  CreateCompetency,
  CreateJobRole,
  CompetencyRequirement,
  CompetencyAssignment,
  CompetencyEvidence,
  FormalAssessment,
  CompetencyRevocation,
  EvidenceReview,
} from "./competencies.schema";
import type { SupportedLanguages } from "@repo/shared";
import type { UUIDType } from "src/common";
@Injectable()
export class CompetenciesRepository {
  constructor(
    @Inject(DB) private readonly db: DatabasePg,
    private readonly localizationService: LocalizationService,
  ) {}
  async catalog() {
    return this.db.select().from(competencies).orderBy(asc(competencies.code));
  }
  async levels() {
    return this.db.select().from(competencyLevels).orderBy(asc(competencyLevels.rank));
  }
  async roles() {
    return this.db.select().from(competencyJobRoles);
  }
  async requirements() {
    return this.db.select().from(competencyRequirements);
  }
  async units(language?: SupportedLanguages) {
    return this.db
      .select({
        id: groups.id,
        name: this.localizationService.getLocalizedSqlField(groups.name, language, groups),
      })
      .from(groups);
  }
  async learningOptions(language?: SupportedLanguages) {
    const coursesList = await this.db
      .select({
        id: courses.id,
        name: this.localizationService.getLocalizedSqlField(courses.title, language, courses),
      })
      .from(courses);
    const paths = await this.db
      .select({
        id: learningPaths.id,
        name: this.localizationService.getLocalizedSqlField(
          learningPaths.title,
          language,
          learningPaths,
        ),
      })
      .from(learningPaths);
    return { courses: coursesList, learningPaths: paths };
  }
  async employees(ids?: UUIDType[]) {
    if (ids?.length === 0) return [];
    return this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobRoleId: competencyAssignments.jobRoleId,
        organizationalUnitId: competencyAssignments.organizationalUnitId,
      })
      .from(users)
      .leftJoin(competencyAssignments, eq(competencyAssignments.userId, users.id))
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.archived, false),
          ids ? inArray(users.id, ids) : undefined,
        ),
      )
      .orderBy(asc(users.firstName));
  }
  async managedUsers(managerId: UUIDType) {
    return this.db
      .selectDistinct({ id: groupUsers.userId })
      .from(groupUsers)
      .innerJoin(groupManagerGroups, eq(groupManagerGroups.groupId, groupUsers.groupId))
      .where(eq(groupManagerGroups.managerUserId, managerId));
  }
  async evidence(userIds: UUIDType[]) {
    if (!userIds.length) return [];
    return this.db
      .select()
      .from(competencyEvidence)
      .where(inArray(competencyEvidence.userId, userIds))
      .orderBy(desc(competencyEvidence.createdAt), desc(competencyEvidence.id));
  }
  async membership(userId: UUIDType, groupId: UUIDType) {
    const [row] = await this.db
      .select({ id: groupUsers.id })
      .from(groupUsers)
      .where(and(eq(groupUsers.userId, userId), eq(groupUsers.groupId, groupId)));
    return !!row;
  }
  async resourceExists(kind: "course" | "path", id: UUIDType) {
    const table = kind === "course" ? courses : learningPaths;
    const [row] = await this.db.select({ id: table.id }).from(table).where(eq(table.id, id));
    return !!row;
  }
  async create(body: CreateCompetency) {
    return this.db.transaction(async (trx) => {
      const { levels, ...data } = body;
      const [row] = await trx.insert(competencies).values(data).returning({ id: competencies.id });
      await trx
        .insert(competencyLevels)
        .values(levels.map((level) => ({ ...level, competencyId: row.id })));
      return row;
    });
  }
  async activate(id: UUIDType, active: boolean) {
    const [row] = await this.db
      .update(competencies)
      .set({ active })
      .where(eq(competencies.id, id))
      .returning({ id: competencies.id });
    return row;
  }
  async createRole(body: CreateJobRole) {
    const [row] = await this.db
      .insert(competencyJobRoles)
      .values(body)
      .returning({ id: competencyJobRoles.id });
    return row;
  }
  async setRequirement(body: CompetencyRequirement) {
    const [row] = await this.db
      .insert(competencyRequirements)
      .values(body)
      .onConflictDoUpdate({
        target: [
          competencyRequirements.tenantId,
          competencyRequirements.jobRoleId,
          competencyRequirements.competencyId,
        ],
        set: body,
      })
      .returning({ id: competencyRequirements.id });
    return row;
  }
  async assign(body: CompetencyAssignment) {
    const [row] = await this.db
      .insert(competencyAssignments)
      .values(body)
      .onConflictDoUpdate({
        target: [competencyAssignments.tenantId, competencyAssignments.userId],
        set: body,
      })
      .returning({ id: competencyAssignments.id });
    return row;
  }
  async appendEvidence(body: CompetencyEvidence, actorId: UUIDType) {
    const assessed = body.status !== "pending";
    const [row] = await this.db
      .insert(competencyEvidence)
      .values({
        ...body,
        evidenceType: body.evidenceType ?? "self_report",
        recordedBy: actorId,
        assessorId: assessed ? actorId : null,
        assessedAt: assessed ? new Date().toISOString() : null,
      })
      .returning({ id: competencyEvidence.id });
    return row;
  }
  async assessments(userIds: UUIDType[]) {
    if (!userIds.length) return [];
    return this.db
      .select()
      .from(competencyAssessments)
      .where(inArray(competencyAssessments.userId, userIds))
      .orderBy(desc(competencyAssessments.revision));
  }
  async revocations(assessmentIds: UUIDType[]) {
    if (!assessmentIds.length) return [];
    return this.db
      .select()
      .from(competencyRevocations)
      .where(inArray(competencyRevocations.assessmentId, assessmentIds))
      .orderBy(desc(competencyRevocations.createdAt));
  }
  async evidenceReviews(evidenceIds: UUIDType[]) {
    if (!evidenceIds.length) return [];
    return this.db
      .select()
      .from(competencyEvidenceReviews)
      .where(inArray(competencyEvidenceReviews.evidenceId, evidenceIds))
      .orderBy(desc(competencyEvidenceReviews.createdAt), desc(competencyEvidenceReviews.id));
  }
  async findEvidence(id: UUIDType) {
    const [row] = await this.db
      .select()
      .from(competencyEvidence)
      .where(eq(competencyEvidence.id, id));
    return row;
  }
  async findAssessment(id: UUIDType) {
    const [row] = await this.db
      .select()
      .from(competencyAssessments)
      .where(eq(competencyAssessments.id, id));
    return row;
  }
  async reviewEvidence(body: EvidenceReview, actorId: UUIDType) {
    const [row] = await this.db
      .insert(competencyEvidenceReviews)
      .values({ ...body, reviewerId: actorId })
      .returning({ id: competencyEvidenceReviews.id });
    return row;
  }
  async assess(body: FormalAssessment, actorId: UUIDType) {
    const commandHash = hashCompetencyCommand(body, actorId);
    return this.db.transaction(async (trx) => {
      await trx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`competency:${body.userId}:${body.competencyId}`}, 0))`,
      );
      const [retry] = await trx
        .select()
        .from(competencyAssessments)
        .where(eq(competencyAssessments.id, body.id));
      if (retry) {
        if (retry.commandHash !== commandHash)
          throw new ConflictException("competencies.errors.commandConflict");
        return { id: retry.id };
      }
      const [current] = await trx
        .select()
        .from(competencyAssessments)
        .where(
          and(
            eq(competencyAssessments.userId, body.userId),
            eq(competencyAssessments.competencyId, body.competencyId),
          ),
        )
        .orderBy(desc(competencyAssessments.revision))
        .limit(1);
      if ((current?.id ?? null) !== body.expectedAssessmentId)
        throw new ConflictException("competencies.errors.assessmentChanged");
      const { expectedAssessmentId, ...data } = body;
      const [row] = await trx
        .insert(competencyAssessments)
        .values({
          ...data,
          supersedesAssessmentId: expectedAssessmentId,
          revision: (current?.revision ?? 0) + 1,
          commandHash,
          assessorId: actorId,
        })
        .returning({ id: competencyAssessments.id });
      return row;
    });
  }
  async revoke(
    body: CompetencyRevocation,
    actorId: UUIDType,
    userId: UUIDType,
    competencyId: UUIDType,
  ) {
    const commandHash = hashCompetencyCommand(body, actorId);
    return this.db.transaction(async (trx) => {
      await trx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`competency:${userId}:${competencyId}`}, 0))`,
      );
      const [retry] = await trx
        .select()
        .from(competencyRevocations)
        .where(eq(competencyRevocations.id, body.id));
      if (retry) {
        if (retry.commandHash !== commandHash)
          throw new ConflictException("competencies.errors.commandConflict");
        return { id: retry.id };
      }
      const [current] = await trx
        .select()
        .from(competencyAssessments)
        .where(
          and(
            eq(competencyAssessments.userId, userId),
            eq(competencyAssessments.competencyId, competencyId),
          ),
        )
        .orderBy(desc(competencyAssessments.revision))
        .limit(1);
      if (current?.id !== body.assessmentId)
        throw new ConflictException("competencies.errors.assessmentChanged");
      const [row] = await trx
        .insert(competencyRevocations)
        .values({ ...body, responsibleId: actorId, commandHash })
        .returning({ id: competencyRevocations.id });
      return row;
    });
  }
}
