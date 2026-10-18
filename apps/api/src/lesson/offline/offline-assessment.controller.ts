import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { PERMISSIONS, type SupportedLanguages } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

import {
  offlineAssessmentResultSchema,
  offlineAssessmentSyncSchema,
  offlineSnapshotResponseSchema,
  OfflineAssessmentSyncBody,
} from "./offline-assessment.schema";
import { OfflineAssessmentService } from "./offline-assessment.service";

import type { OfflineSnapshotResponse } from "./offline-assessment.schema";
import type { OfflineAssessmentResult } from "./offline-assessment.types";

@Controller("offline-assessments")
export class OfflineAssessmentController {
  constructor(private readonly offlineAssessmentService: OfflineAssessmentService) {}
  @Get(":lessonId/snapshot")
  @RequirePermission(PERMISSIONS.LEARNING_PROGRESS_UPDATE, PERMISSIONS.LEARNING_MODE_USE)
  @Validate({
    request: [
      { type: "param", name: "lessonId", schema: UUIDSchema },
      { type: "query", name: "language", schema: supportedLanguagesSchema, required: true },
    ],
    response: baseResponse(offlineSnapshotResponseSchema),
  })
  async getOfflineAssessmentSnapshot(
    @Param("lessonId") lessonId: UUIDType,
    @Query("language") language: SupportedLanguages,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<OfflineSnapshotResponse>> {
    return new BaseResponse(
      await this.offlineAssessmentService.snapshot(lessonId, language, actor),
    );
  }
  @Post("sync")
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.LEARNING_PROGRESS_UPDATE, PERMISSIONS.LEARNING_MODE_USE)
  @Validate({
    request: [{ type: "body", schema: offlineAssessmentSyncSchema }],
    response: baseResponse(offlineAssessmentResultSchema),
  })
  async submitOfflineAssessment(
    @Body() body: OfflineAssessmentSyncBody,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<OfflineAssessmentResult>> {
    return new BaseResponse(await this.offlineAssessmentService.sync(body, actor));
  }
}
