import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { DB } from "src/storage/db/db.providers";
import {
  competencyDevelopmentPlans as plans,
  competencyPlanActivities as activities,
  competencyPlanHistory as history,
  competencyAssessments,
  competencyRevocations,
  competencyEvidence,
  competencyEvidenceReviews,
  users,
} from "src/storage/schema";

import { hashCompetencyCommand } from "./competency-command";
import { transitionDevelopmentPlan } from "./development-plan-transitions";

import type { CreateDevelopmentPlan, DevelopmentPlanCommand } from "./development-plans.schema";
import type { UUIDType } from "src/common";
@Injectable()
export class DevelopmentPlansRepository {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}
  async find(id: UUIDType) {
    const [row] = await this.db.select().from(plans).where(eq(plans.id, id));
    return row;
  }
  async workspace(userIds: UUIDType[]) {
    if (!userIds.length) return { plans: [], activities: [], history: [], people: [] };
    const rows = await this.db
      .select()
      .from(plans)
      .where(inArray(plans.userId, userIds))
      .orderBy(desc(plans.createdAt));
    if (!rows.length) return { plans: [], activities: [], history: [], people: [] };
    const ids = rows.map((x) => x.id);
    const decisions = await this.db
      .select()
      .from(history)
      .where(inArray(history.planId, ids))
      .orderBy(desc(history.version));
    const actorIds = [
      ...new Set([
        ...rows.map((x) => x.createdBy),
        ...rows.flatMap((x) => (x.responsibleId ? [x.responsibleId] : [])),
        ...decisions.map((x) => x.actorId),
      ]),
    ];
    const people = await this.db
      .select({
        id: users.id,
        name: sql<string>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
      })
      .from(users)
      .where(inArray(users.id, actorIds));
    return {
      plans: rows.map(
        ({ commandHash: _hash, tenantId: _tenant, updatedAt: _updated, ...row }) => row,
      ),
      activities: await this.db.select().from(activities).where(inArray(activities.planId, ids)),
      history: decisions.map(
        ({ commandHash: _hash, tenantId: _tenant, updatedAt: _updated, ...row }) => row,
      ),
      people,
    };
  }

  async create(body: CreateDevelopmentPlan, actorId: UUIDType) {
    const commandHash = hashCompetencyCommand(body, actorId);
    return this.db.transaction(async (trx) => {
      await trx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`development-plan:${body.id}`}, 0))`,
      );
      const [retry] = await trx.select().from(plans).where(eq(plans.id, body.id));
      if (retry) {
        if (retry.commandHash !== commandHash)
          throw new ConflictException("competencies.errors.commandConflict");
        return { id: retry.id };
      }
      const { activities: items, ...data } = body;
      const [row] = await trx
        .insert(plans)
        .values({ ...data, createdBy: actorId, commandHash })
        .returning({ id: plans.id });
      await trx.insert(activities).values(items.map((item) => ({ ...item, planId: row.id })));
      await trx.insert(history).values({
        id: row.id,
        planId: row.id,
        actorId,
        action: "create",
        rationale: body.title,
        version: 1,
        toState: "draft",
        commandHash,
      });
      return row;
    });
  }
  async command(
    planId: UUIDType,
    body: DevelopmentPlanCommand,
    actorId: UUIDType,
    canApprove: boolean,
  ) {
    const commandHash = hashCompetencyCommand({ ...body, planId }, actorId);
    return this.db.transaction(async (trx) => {
      const [reference] = await trx.select().from(plans).where(eq(plans.id, planId));
      if (!reference) throw new NotFoundException("competencies.errors.notFound");
      // Same lock as assessment/revocation: the completion decision cannot race a new rating.
      await trx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`competency:${reference.userId}:${reference.competencyId}`}, 0))`,
      );
      const [current] = await trx.select().from(plans).where(eq(plans.id, planId)).for("update");
      const [retry] = await trx.select().from(history).where(eq(history.id, body.id));
      if (retry) {
        if (retry.commandHash !== commandHash)
          throw new ConflictException("competencies.errors.commandConflict");
        return { id: current.id };
      }
      if (current.version !== body.expectedVersion)
        throw new ConflictException("competencies.errors.planChanged");
      const next = transitionDevelopmentPlan(current.state, body.action, canApprove);
      let completedAssessmentId = current.completedAssessmentId;
      const items = await trx.select().from(activities).where(eq(activities.planId, planId));
      if (body.action === "report_activity") {
        if (!body.activityId || !items.some((x) => x.id === body.activityId))
          throw new BadRequestException("competencies.errors.invalidReference");
        await trx
          .update(activities)
          .set({ reportedAt: new Date().toISOString(), reportedBy: actorId })
          .where(eq(activities.id, body.activityId));
      } else if (body.activityId)
        throw new BadRequestException("competencies.errors.invalidReference");
      if (["submit", "complete"].includes(body.action) && items.some((x) => !x.reportedAt))
        throw new BadRequestException("competencies.errors.activitiesIncomplete");
      if (body.action === "complete") {
        const [assessment] = await trx
          .select()
          .from(competencyAssessments)
          .where(
            and(
              eq(competencyAssessments.userId, current.userId),
              eq(competencyAssessments.competencyId, current.competencyId),
            ),
          )
          .orderBy(desc(competencyAssessments.revision))
          .limit(1);
        const now = Date.now();
        if (
          !assessment ||
          assessment.level < current.targetLevel ||
          (assessment.expiresAt && Date.parse(assessment.expiresAt) <= now) ||
          !assessment.sourceEvidenceId
        )
          throw new BadRequestException("competencies.errors.planAssessmentRequired");
        const restrictions = await trx
          .select()
          .from(competencyRevocations)
          .where(eq(competencyRevocations.assessmentId, assessment.id));
        if (
          restrictions.some(
            (x) => Date.parse(x.effectiveAt) <= now && (!x.endsAt || Date.parse(x.endsAt) > now),
          )
        )
          throw new BadRequestException("competencies.errors.planAssessmentRequired");
        const [proof] = await trx
          .select()
          .from(competencyEvidence)
          .where(eq(competencyEvidence.id, assessment.sourceEvidenceId));
        const [review] = await trx
          .select()
          .from(competencyEvidenceReviews)
          .where(eq(competencyEvidenceReviews.evidenceId, assessment.sourceEvidenceId))
          .orderBy(desc(competencyEvidenceReviews.createdAt), desc(competencyEvidenceReviews.id))
          .limit(1);
        if (
          !proof ||
          proof.developmentPlanId !== current.id ||
          (review?.status ?? proof.status) !== "approved"
        )
          throw new BadRequestException("competencies.errors.planAssessmentRequired");
        completedAssessmentId = assessment.id;
      }
      await trx
        .update(plans)
        .set({
          state: next,
          version: current.version + 1,
          completedAssessmentId,
          responsibleId: body.action === "approve" ? actorId : current.responsibleId,
        })
        .where(eq(plans.id, planId));
      await trx.insert(history).values({
        id: body.id,
        planId,
        actorId,
        action: body.action,
        rationale: body.rationale,
        version: current.version + 1,
        fromState: current.state,
        toState: next,
        activityId: body.activityId,
        assessmentId: completedAssessmentId,
        commandHash,
      });
      return { id: planId };
    });
  }
}
