import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type SupportedLanguages, PERMISSIONS, hasPermission } from "@repo/shared";

import { CompetenciesRepository } from "./competencies.repository";
import { buildCompetencyGaps } from "./competency-gaps";

import type {
  CreateCompetency,
  CreateJobRole,
  CompetencyRequirement,
  CompetencyAssignment,
  CompetencyEvidence,
  CompetencyWorkspace,
  FormalAssessment,
  CompetencyRevocation,
  EvidenceReview,
} from "./competencies.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";
@Injectable()
export class CompetenciesService {
  constructor(private readonly competenciesRepository: CompetenciesRepository) {}
  private manage(actor: CurrentUserType) {
    if (!hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE))
      throw new ForbiddenException("competencies.errors.forbidden");
  }
  private async scope(actor: CurrentUserType) {
    if (hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE)) return undefined;
    if (hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_ASSESS_MANAGED))
      return [
        ...new Set([
          actor.userId,
          ...(await this.competenciesRepository.managedUsers(actor.userId)).map((x) => x.id),
        ]),
      ];
    return [actor.userId];
  }
  private async employee(actor: CurrentUserType, userId: UUIDType) {
    const scope = await this.scope(actor);
    if (scope && !scope.includes(userId))
      throw new ForbiddenException("competencies.errors.forbidden");
    const [user] = await this.competenciesRepository.employees([userId]);
    if (!user) throw new NotFoundException("competencies.errors.notFound");
    return user;
  }
  private async level(competencyId: UUIDType, rank: number) {
    const catalog = await this.competenciesRepository.catalog();
    if (!catalog.some((x) => x.id === competencyId && x.active))
      throw new BadRequestException("competencies.errors.invalidReference");
    if (
      !(await this.competenciesRepository.levels()).some(
        (x) => x.competencyId === competencyId && x.rank === rank,
      )
    )
      throw new BadRequestException("competencies.errors.invalidLevel");
  }
  private dates(from: string, until: string | null) {
    if (until && Date.parse(until) <= Date.parse(from))
      throw new BadRequestException("competencies.errors.invalidDates");
  }
  async workspace(
    actor: CurrentUserType,
    userId?: UUIDType,
    language?: SupportedLanguages,
  ): Promise<CompetencyWorkspace> {
    if (userId) await this.employee(actor, userId);
    const scope = userId ? [userId] : await this.scope(actor);
    const [catalog, levels, roles, requirements, units, employees] = await Promise.all([
      this.competenciesRepository.catalog(),
      this.competenciesRepository.levels(),
      this.competenciesRepository.roles(),
      this.competenciesRepository.requirements(),
      this.competenciesRepository.units(language),
      this.competenciesRepository.employees(scope),
    ]);
    const evidence = await this.competenciesRepository.evidence(employees.map((x) => x.id));
    const assessments = await this.competenciesRepository.assessments(employees.map((x) => x.id));
    const revocations = await this.competenciesRepository.revocations(assessments.map((x) => x.id));
    const evidenceReviews = await this.competenciesRepository.evidenceReviews(
      evidence.map((x) => x.id),
    );
    const reviewsByEvidence = new Map<string, (typeof evidenceReviews)[number]>();
    for (const row of evidenceReviews)
      if (!reviewsByEvidence.has(row.evidenceId)) reviewsByEvidence.set(row.evidenceId, row);
    const matrix = buildCompetencyGaps({
      employees,
      catalog,
      requirements,
      orderedEvidence: evidence.map((row) => ({
        ...row,
        status: reviewsByEvidence.get(row.id)?.status ?? row.status,
      })),
      orderedAssessments: assessments,
      revocations,
    });
    return {
      canManage: hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE),
      canAssess: hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_ASSESS_MANAGED),
      catalog: catalog.map((x) => ({
        ...x,
        levels: levels
          .filter((l) => l.competencyId === x.id)
          .map((l) => ({ rank: l.rank, label: l.label })),
      })),
      roles,
      requirements,
      learning: hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE)
        ? await this.competenciesRepository.learningOptions(language)
        : { courses: [], learningPaths: [] },
      units: hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE)
        ? units
        : units.filter((x) => employees.some((e) => e.organizationalUnitId === x.id)),
      employees: employees.map((x) => ({
        id: x.id,
        name: [x.firstName, x.lastName].join(" "),
        jobRoleId: x.jobRoleId,
        organizationalUnitId: x.organizationalUnitId,
      })),
      matrix,
      evidence,
      assessments,
      revocations,
      evidenceReviews,
    };
  }
  async create(actor: CurrentUserType, body: CreateCompetency) {
    this.manage(actor);
    if (new Set(body.levels.map((x) => x.rank)).size !== body.levels.length)
      throw new BadRequestException("competencies.errors.invalidLevel");
    if ((await this.competenciesRepository.catalog()).some((x) => x.code === body.code))
      throw new ConflictException("competencies.errors.duplicateCode");
    return this.competenciesRepository.create(body);
  }
  async activate(actor: CurrentUserType, id: UUIDType, active: boolean) {
    this.manage(actor);
    const row = await this.competenciesRepository.activate(id, active);
    if (!row) throw new NotFoundException("competencies.errors.notFound");
    return row;
  }
  async createRole(actor: CurrentUserType, body: CreateJobRole) {
    this.manage(actor);
    if ((await this.competenciesRepository.roles()).some((x) => x.code === body.code))
      throw new ConflictException("competencies.errors.duplicateCode");
    return this.competenciesRepository.createRole(body);
  }
  async requirement(actor: CurrentUserType, body: CompetencyRequirement) {
    this.manage(actor);
    await this.level(body.competencyId, body.minimumLevel);
    if (!(await this.competenciesRepository.roles()).some((x) => x.id === body.jobRoleId))
      throw new BadRequestException("competencies.errors.invalidReference");
    this.dates(body.effectiveFrom, body.effectiveUntil);
    if (
      body.courseId &&
      !(await this.competenciesRepository.resourceExists("course", body.courseId))
    )
      throw new BadRequestException("competencies.errors.invalidReference");
    if (
      body.learningPathId &&
      !(await this.competenciesRepository.resourceExists("path", body.learningPathId))
    )
      throw new BadRequestException("competencies.errors.invalidReference");
    return this.competenciesRepository.setRequirement(body);
  }
  async assign(actor: CurrentUserType, body: CompetencyAssignment) {
    this.manage(actor);
    await this.employee(actor, body.userId);
    if (
      !(await this.competenciesRepository.roles()).some((x) => x.id === body.jobRoleId) ||
      !(await this.competenciesRepository.membership(body.userId, body.organizationalUnitId))
    )
      throw new BadRequestException("competencies.errors.invalidReference");
    return this.competenciesRepository.assign(body);
  }
  async evidence(actor: CurrentUserType, body: CompetencyEvidence) {
    await this.employee(actor, body.userId);
    await this.level(body.competencyId, body.level);
    const manager = hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE);
    const assessor = hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_ASSESS_MANAGED);
    if (body.status !== "pending" && !manager && (!assessor || body.userId === actor.userId))
      throw new ForbiddenException("competencies.errors.forbidden");
    if (body.status === "pending" && body.userId !== actor.userId && !manager && !assessor)
      throw new ForbiddenException("competencies.errors.forbidden");
    const now = new Date().toISOString();
    this.dates(now, body.expiresAt);
    this.dates(now, body.reviewAt);
    return this.competenciesRepository.appendEvidence(body, actor.userId);
  }
  private async assessor(actor: CurrentUserType, userId: UUIDType) {
    await this.employee(actor, userId);
    const admin = hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_MANAGE);
    if (
      !admin &&
      (!hasPermission(actor.permissions, PERMISSIONS.COMPETENCY_ASSESS_MANAGED) ||
        actor.userId === userId)
    )
      throw new ForbiddenException("competencies.errors.forbidden");
  }
  async review(actor: CurrentUserType, body: EvidenceReview) {
    const row = await this.competenciesRepository.findEvidence(body.evidenceId);
    if (!row) throw new NotFoundException("competencies.errors.notFound");
    await this.assessor(actor, row.userId);
    return this.competenciesRepository.reviewEvidence(body, actor.userId);
  }
  async assess(actor: CurrentUserType, body: FormalAssessment) {
    await this.assessor(actor, body.userId);
    await this.level(body.competencyId, body.level);
    this.dates(new Date().toISOString(), body.expiresAt);
    this.dates(new Date().toISOString(), body.reviewAt);
    if (body.sourceEvidenceId) {
      const row = await this.competenciesRepository.findEvidence(body.sourceEvidenceId);
      if (!row || row.userId !== body.userId || row.competencyId !== body.competencyId)
        throw new BadRequestException("competencies.errors.invalidReference");
      const [review] = await this.competenciesRepository.evidenceReviews([row.id]);
      if ((review?.status ?? row.status) !== "approved")
        throw new BadRequestException("competencies.errors.evidenceNotApproved");
    }
    return this.competenciesRepository.assess(body, actor.userId);
  }
  async revoke(actor: CurrentUserType, body: CompetencyRevocation) {
    const row = await this.competenciesRepository.findAssessment(body.assessmentId);
    if (!row) throw new NotFoundException("competencies.errors.notFound");
    await this.assessor(actor, row.userId);
    if (body.kind === "revoked" && body.endsAt)
      throw new BadRequestException("competencies.errors.invalidDates");
    this.dates(body.effectiveAt, body.endsAt);
    return this.competenciesRepository.revoke(body, actor.userId, row.userId, row.competencyId);
  }
}
