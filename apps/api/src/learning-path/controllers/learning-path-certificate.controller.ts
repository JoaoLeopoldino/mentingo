import {
  Body,
  Param,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
} from "@nestjs/common";
import { PERMISSIONS, SUPPORTED_LANGUAGES, SupportedLanguages } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Request, Response } from "express";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { Public } from "src/common/decorators/public.decorator";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { getRequestBaseUrl } from "src/common/helpers/getRequestBaseUrl";
import { CurrentUserType } from "src/common/types/current-user.type";
import { supportedLanguagesSchema } from "src/courses/schemas/course.schema";

import { LearningPathsEnabledGuard } from "../guards/learning-paths-enabled.guard";
import {
  pathCertificateDecisionSchema,
  renewPathCertificateSchema,
  pathCertificateLifecycleSchema,
  pathCertificateHistorySchema,
  type PathCertificateDecision,
  type RenewPathCertificate,
  type PathCertificateLifecycle,
  type PathCertificateHistory,
} from "../learning-path-certificate-lifecycle.schema";
import {
  learningPathCertificateCreateShareLinkSchema,
  learningPathCertificateDownloadSchema,
  learningPathCertificateShareLinkSchema,
  learningPathCertificateShareSchema,
  type LearningPathCertificateCreateShareLinkBody,
  type LearningPathCertificateDownloadBody,
  type LearningPathCertificateShareLink,
  type LearningPathCertificateShare,
} from "../learning-path.schema";
import { LearningPathCertificateLifecycleService } from "../services/learning-path-certificate-lifecycle.service";
import { LearningPathCertificateService } from "../services/learning-path-certificate.service";

@Controller("learning-path/certificates")
@UseGuards(PermissionsGuard, LearningPathsEnabledGuard)
export class LearningPathCertificateController {
  constructor(
    private readonly learningPathCertificateService: LearningPathCertificateService,
    private readonly learningPathCertificateLifecycleService: LearningPathCertificateLifecycleService,
  ) {}

  @Get("history")
  @RequirePermission(PERMISSIONS.CERTIFICATE_READ, PERMISSIONS.MANAGED_GROUP_RESULTS_READ)
  @Validate({
    request: [
      { type: "query", name: "userId", schema: UUIDSchema },
      { type: "query", name: "learningPathId", schema: UUIDSchema },
    ],
    response: baseResponse(pathCertificateHistorySchema),
  })
  async history(
    @Query("userId") userId: UUIDType,
    @Query("learningPathId") pathId: UUIDType,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<PathCertificateHistory>> {
    return new BaseResponse(
      await this.learningPathCertificateLifecycleService.history(userId, pathId, actor),
    );
  }
  @Post(":certificateId/revoke")
  @RequirePermission(PERMISSIONS.LEARNING_PATH_UPDATE, PERMISSIONS.USER_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "certificateId", schema: UUIDSchema },
      { type: "body", schema: pathCertificateDecisionSchema },
    ],
    response: baseResponse(pathCertificateLifecycleSchema),
  })
  async revoke(
    @Param("certificateId") id: UUIDType,
    @Body() body: PathCertificateDecision,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<PathCertificateLifecycle>> {
    return new BaseResponse(
      await this.learningPathCertificateLifecycleService.revoke(id, body.reason, actor),
    );
  }
  @Post(":certificateId/renew")
  @RequirePermission(PERMISSIONS.LEARNING_PATH_UPDATE, PERMISSIONS.USER_MANAGE)
  @Validate({
    request: [
      { type: "param", name: "certificateId", schema: UUIDSchema },
      { type: "body", schema: renewPathCertificateSchema },
    ],
    response: baseResponse(pathCertificateLifecycleSchema),
  })
  async renew(
    @Param("certificateId") id: UUIDType,
    @Body() body: RenewPathCertificate,
    @CurrentUser() actor: CurrentUserType,
  ): Promise<BaseResponse<PathCertificateLifecycle>> {
    return new BaseResponse(
      await this.learningPathCertificateLifecycleService.renew(id, body, actor),
    );
  }

  @Get("certificate")
  @RequirePermission(PERMISSIONS.CERTIFICATE_READ)
  @Validate({
    request: [
      { type: "query", name: "userId", schema: UUIDSchema },
      { type: "query", name: "learningPathId", schema: UUIDSchema },
      { type: "query", name: "language", schema: supportedLanguagesSchema },
    ],
    response: learningPathCertificateShareSchema,
  })
  async getCertificate(
    @Query("userId") userId: UUIDType,
    @Query("learningPathId") learningPathId: UUIDType,
    @Query("language") language: SupportedLanguages,
    @CurrentUser() currentUser: CurrentUserType,
    @Res() res: Response,
  ): Promise<LearningPathCertificateShare> {
    const certificate = await this.learningPathCertificateService.getLearningPathCertificate(
      userId,
      learningPathId,
      language,
      currentUser,
    );
    res.set("Cache-Control", "private, no-store").json(certificate);
    return certificate;
  }

  @Post("download")
  @RequirePermission(PERMISSIONS.CERTIFICATE_RENDER)
  @Validate({
    request: [{ type: "body", schema: learningPathCertificateDownloadSchema }],
  })
  async downloadCertificate(
    @Body() body: LearningPathCertificateDownloadBody,
    @CurrentUser() currentUser: CurrentUserType,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const requestBaseUrl = getRequestBaseUrl(req);
    const { pdfBuffer, filename } =
      await this.learningPathCertificateService.downloadLearningPathCertificate(
        currentUser.userId,
        body.certificateId,
        body.language,
        requestBaseUrl,
      );

    const asciiFilename =
      filename
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/["\\]/g, "")
        .trim() || "certificate.pdf";

    const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post("share-link")
  @RequirePermission(PERMISSIONS.CERTIFICATE_SHARE)
  @Validate({
    request: [{ type: "body", schema: learningPathCertificateCreateShareLinkSchema }],
    response: learningPathCertificateShareLinkSchema,
  })
  async createCertificateShareLink(
    @Body() body: LearningPathCertificateCreateShareLinkBody,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<LearningPathCertificateShareLink> {
    return this.learningPathCertificateService.createLearningPathCertificateShareLink(
      currentUser.userId,
      body.certificateId,
      body.language,
    );
  }

  @Public()
  @Get("share")
  @Validate({
    request: [
      { type: "query", name: "certificateId", schema: UUIDSchema, pipes: [new ParseUUIDPipe()] },
      {
        type: "query",
        name: "lang",
        schema: Type.Optional(supportedLanguagesSchema),
        pipes: [new ParseEnumPipe(SUPPORTED_LANGUAGES, { optional: true })],
      },
    ],
  })
  async getCertificateSharePage(
    @Query("certificateId") certificateId: UUIDType,
    @Query("lang") language: SupportedLanguages,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.learningPathCertificateService.getPublicSharePage(
      certificateId,
      language,
    );

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });

    res.send(html);
  }

  @Public()
  @Get("share-image")
  @Validate({
    request: [
      { type: "query", name: "certificateId", schema: UUIDSchema, pipes: [new ParseUUIDPipe()] },
      {
        type: "query",
        name: "lang",
        schema: Type.Optional(supportedLanguagesSchema),
        pipes: [new ParseEnumPipe(SUPPORTED_LANGUAGES, { optional: true })],
      },
    ],
  })
  async getCertificateShareImage(
    @Query("certificateId") certificateId: UUIDType,
    @Query("lang") language: SupportedLanguages,
    @Res() res: Response,
  ): Promise<void> {
    const imageBuffer = await this.learningPathCertificateService.getPublicShareImage(
      certificateId,
      language,
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Length": imageBuffer.length,
      "Cache-Control": "no-store",
    });

    res.send(imageBuffer);
  }
}
