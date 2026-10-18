import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { PERMISSIONS, type SupportedLanguages } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

import {
  assignmentSchema,
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
  CompetencyEvidence
} from "./competencies.schema";
import { CompetenciesService } from "./competencies.service";

import type {
  CompetencyWorkspace,
  CompetencyIdResponse} from "./competencies.schema";
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
      { type: "query", name: "language", schema: supportedLanguagesSchema, required: false },
    ],
    response: baseResponse(competencyWorkspaceSchema),
  })
  async getCompetencyWorkspace(
    @Query("userId") userId: UUIDType | undefined,
    @Query("language") language: SupportedLanguages | undefined,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<CompetencyWorkspace>> {
    return new BaseResponse(await this.competenciesService.workspace(actor, userId, language));
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
}
