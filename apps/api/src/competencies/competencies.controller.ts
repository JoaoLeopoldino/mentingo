import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { PERMISSIONS, type SupportedLanguages } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

import {
  assignmentSchema,
  evidenceReviewSchema,
  formalAssessmentSchema,
  revocationSchema,
  EvidenceReview,
  FormalAssessment,
  CompetencyRevocation,
  competencyActiveSchema,
  competencyIdResponseSchema,
  competencyWorkspaceSchema,
  createCompetencySchema,
  createJobRoleSchema,
  evidenceSchema,
  requirementSchema,
  CreateCompetency,
  CreateJobRole,
  CompetencyRequirement,
  CompetencyAssignment,
  CompetencyEvidence,
} from "./competencies.schema";
import { CompetenciesService } from "./competencies.service";
import {
  createCompetencyFrameworkSchema,
  createCompetencyScaleSchema,
  competencyFrameworkSetupSchema,
  CreateCompetencyFramework,
  CreateCompetencyScale,
} from "./competency-frameworks.schema";
import {
  createDevelopmentPlanSchema,
  developmentPlanCommandSchema,
  developmentPlansWorkspaceSchema,
  CreateDevelopmentPlan,
  DevelopmentPlanCommand,
} from "./development-plans.schema";
import {
  createCompetencyJobAssignmentSchema,
  CreateCompetencyJobAssignment,
} from "./job-assignments.schema";

import type { CompetencyWorkspace, CompetencyIdResponse } from "./competencies.schema";
import type { CompetencyWorkspaceFilters } from "./competencies.types";
import type { CompetencyFrameworkSetup } from "./competency-frameworks.schema";
import type { DevelopmentPlansWorkspace } from "./development-plans.schema";
@Controller("competencies")
@RequirePermission(
  PERMISSIONS.COMPETENCY_READ_SELF,
  PERMISSIONS.COMPETENCY_MANAGE,
  PERMISSIONS.COMPETENCY_ASSESS_MANAGED,
)
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}
  @Get("workspace")
  @Validate({
    request: [
      { type: "query", name: "userId", schema: UUIDSchema, required: false },
      {
        type: "query",
        name: "page",
        schema: Type.Integer({ minimum: 1, maximum: 100000 }),
        required: false,
      },
      {
        type: "query",
        name: "perPage",
        schema: Type.Integer({ minimum: 1, maximum: 100 }),
        required: false,
      },
      { type: "query", name: "keyword", schema: Type.String({ maxLength: 200 }), required: false },
      {
        type: "query",
        name: "pendingEvidenceOnly",
        schema: Type.Union([Type.Boolean(), Type.Literal("true"), Type.Literal("false")]),
        required: false,
      },
      { type: "query", name: "organizationalUnitId", schema: UUIDSchema, required: false },
      { type: "query", name: "jobRoleId", schema: UUIDSchema, required: false },
      {
        type: "query",
        name: "status",
        schema: competencyWorkspaceSchema.properties.matrix.items.properties.status,
        required: false,
      },
      { type: "query", name: "language", schema: supportedLanguagesSchema, required: false },
    ],
    response: baseResponse(competencyWorkspaceSchema),
  })
  async getCompetencyWorkspace(
    @Query("userId") userId: UUIDType | undefined,
    @Query("page") page: number | undefined,
    @Query("perPage") perPage: number | undefined,
    @Query("keyword") keyword: string | undefined,
    @Query("pendingEvidenceOnly") pendingEvidenceOnly: boolean | "true" | "false" | undefined,
    @Query("organizationalUnitId") organizationalUnitId: UUIDType | undefined,
    @Query("jobRoleId") jobRoleId: UUIDType | undefined,
    @Query("status") status: CompetencyWorkspaceFilters["status"],
    @Query("language") language: SupportedLanguages | undefined,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyWorkspace>> {
    return new BaseResponse(
      await this.competenciesService.workspace(actor, userId, language, {
        page,
        perPage,
        keyword,
        pendingEvidenceOnly: pendingEvidenceOnly === true || pendingEvidenceOnly === "true",
        organizationalUnitId,
        jobRoleId,
        status,
      }),
    );
  }

  @Post("catalog")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createCompetencySchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createCompetency(
    @Body() body: CreateCompetency,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.create(actor, body));
  }
  @Patch("catalog/:id")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: competencyActiveSchema },
    ],
    response: baseResponse(competencyIdResponseSchema),
  })
  async setCompetencyActive(
    @Param("id") id: UUIDType,
    @Body() body: { active: boolean },
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.activate(actor, id, body.active));
  }
  @Post("roles")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createJobRoleSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createCompetencyJobRole(
    @Body() body: CreateJobRole,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.createRole(actor, body));
  }
  @Put("requirements")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: requirementSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async setCompetencyRequirement(
    @Body() body: CompetencyRequirement,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.requirement(actor, body));
  }
  @Put("assignments")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: assignmentSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async assignCompetencyRole(
    @Body() body: CompetencyAssignment,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.assign(actor, body));
  }
  @Post("evidence")
  @Validate({
    request: [{ type: "body", schema: evidenceSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async recordCompetencyEvidence(
    @Body() body: CompetencyEvidence,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.evidence(actor, body));
  }
  @Post("evidence-reviews")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE, PERMISSIONS.COMPETENCY_ASSESS_MANAGED)
  @Validate({
    request: [{ type: "body", schema: evidenceReviewSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async reviewCompetencyEvidence(
    @Body() body: EvidenceReview,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.review(actor, body));
  }
  @Post("assessments")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE, PERMISSIONS.COMPETENCY_ASSESS_MANAGED)
  @Validate({
    request: [{ type: "body", schema: formalAssessmentSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async assessCompetency(
    @Body() body: FormalAssessment,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.assess(actor, body));
  }
  @Post("revocations")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE, PERMISSIONS.COMPETENCY_ASSESS_MANAGED)
  @Validate({
    request: [{ type: "body", schema: revocationSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async revokeCompetencyAssessment(
    @Body() body: CompetencyRevocation,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.revoke(actor, body));
  }
  @Get("development-plans")
  @Validate({
    request: [{ type: "query", name: "userId", schema: UUIDSchema, required: false }],
    response: baseResponse(developmentPlansWorkspaceSchema),
  })
  async getDevelopmentPlans(
    @Query("userId") userId: UUIDType | undefined,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<DevelopmentPlansWorkspace>> {
    return new BaseResponse(await this.competenciesService.developmentPlans(actor, userId));
  }
  @Post("development-plans")
  @Validate({
    request: [{ type: "body", schema: createDevelopmentPlanSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createDevelopmentPlan(
    @Body() body: CreateDevelopmentPlan,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.createDevelopmentPlan(actor, body));
  }
  @Post("development-plans/:id/decisions")
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: developmentPlanCommandSchema },
    ],
    response: baseResponse(competencyIdResponseSchema),
  })
  async decideDevelopmentPlan(
    @Param("id") id: UUIDType,
    @Body() body: DevelopmentPlanCommand,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.developmentPlanCommand(actor, id, body));
  }
  @Get("framework-setup")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({ response: baseResponse(competencyFrameworkSetupSchema) })
  async getCompetencyFrameworkSetup(
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyFrameworkSetup>> {
    return new BaseResponse(await this.competenciesService.frameworkSetup(actor));
  }
  @Post("frameworks")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createCompetencyFrameworkSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createCompetencyFramework(
    @Body() body: CreateCompetencyFramework,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.createFramework(actor, body));
  }
  @Post("scales")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createCompetencyScaleSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createCompetencyScale(
    @Body() body: CreateCompetencyScale,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.createScale(actor, body));
  }
  @Post("job-assignments")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "body", schema: createCompetencyJobAssignmentSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async createCompetencyJobAssignment(
    @Body() body: CreateCompetencyJobAssignment,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.createJobAssignment(actor, body));
  }
  @Post("job-assignments/:id/end")
  @RequirePermission(PERMISSIONS.COMPETENCY_MANAGE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(competencyIdResponseSchema),
  })
  async endCompetencyJobAssignment(
    @Param("id") id: UUIDType,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyIdResponse>> {
    return new BaseResponse(await this.competenciesService.endJobAssignment(actor, id));
  }
}
