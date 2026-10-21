import { Injectable, Logger } from "@nestjs/common";

import {
  MICROSOFT_TEAMS_MEETING_SCOPES,
  MicrosoftGraphApiClient,
  MicrosoftGraphError,
} from "../clients/microsoft-graph-api.client";
import { MicrosoftCalendarRepository } from "../repositories/microsoft-calendar.repository";
import {
  LIVE_TRAINING_TEAMS_ERROR_CODES,
  LIVE_TRAINING_TEAMS_STATUSES,
  type LiveTrainingTeamsErrorCode,
  type LiveTrainingTeamsState,
} from "../types/live-training-teams.types";
import { MICROSOFT_CALENDAR_SYNC_REASONS } from "../types/microsoft-calendar.types";

import { MicrosoftCalendarSyncQueueService } from "./microsoft-calendar-sync-queue.service";
import { MicrosoftCalendarTokenEncryptionService } from "./microsoft-calendar-token-encryption.service";

import type { UUIDType } from "src/common";

@Injectable()
export class LiveTrainingTeamsMeetingService {
  private readonly logger = new Logger(LiveTrainingTeamsMeetingService.name);

  constructor(
    private readonly microsoftCalendarRepository: MicrosoftCalendarRepository,
    private readonly microsoftGraphApiClient: MicrosoftGraphApiClient,
    private readonly microsoftCalendarTokenEncryptionService: MicrosoftCalendarTokenEncryptionService,
    private readonly microsoftCalendarSyncQueueService: MicrosoftCalendarSyncQueueService,
  ) {}

  /**
   * Keeps one Teams meeting per live training. The meeting is created once, by the first
   * host (author first) with a connected Microsoft account, and its join link is stored on the
   * live training so every participant's Outlook event can carry the same link.
   */
  async syncLiveTraining(liveTrainingId: UUIDType) {
    const row = await this.microsoftCalendarRepository.getLiveTrainingTeamsState(liveTrainingId);
    const current = this.readState(row?.metadata);

    if (!row || !current) return;

    const isActive = current.requested && !row.deletedAt && !row.eventDeletedAt;

    if (!isActive) {
      await this.removeMeeting(row.id, current);
      return;
    }

    if (!(await this.microsoftGraphApiClient.isTeamsMeetingsEnabled())) {
      await this.saveError(row.id, current, LIVE_TRAINING_TEAMS_ERROR_CODES.DISABLED);
      return;
    }

    const organizer = await this.findOrganizer(row.id, row.authorId);

    if (!organizer) {
      await this.saveError(row.id, current, LIVE_TRAINING_TEAMS_ERROR_CODES.NO_CONNECTED_ORGANIZER);
      return;
    }

    try {
      const accessToken = await this.getAccessToken(organizer.connection);
      const meeting = {
        subject: this.getTitle(row.title, row.baseLanguage),
        startDateTime: new Date(row.startsAt).toISOString(),
        endDateTime: new Date(row.endsAt).toISOString(),
      };
      const sameOrganizer = current.organizerUserId === organizer.userId;

      if (current.meetingId && !sameOrganizer) {
        await this.removeMeeting(row.id, current);
      }

      let meetingId = sameOrganizer ? current.meetingId : undefined;
      let joinUrl = sameOrganizer ? current.joinUrl : undefined;

      if (meetingId) {
        try {
          await this.microsoftGraphApiClient.updateOnlineMeeting(accessToken, meetingId, meeting);
        } catch (error) {
          if (!(error instanceof MicrosoftGraphError) || error.statusCode !== 404) throw error;

          meetingId = undefined;
        }
      }

      if (!meetingId) {
        const created = await this.microsoftGraphApiClient.createOnlineMeeting(
          accessToken,
          meeting,
        );

        meetingId = created.id;
        joinUrl = created.joinWebUrl;
      }

      await this.microsoftCalendarRepository.saveLiveTrainingTeamsState(row.id, {
        requested: true,
        status: LIVE_TRAINING_TEAMS_STATUSES.READY,
        meetingId,
        joinUrl,
        organizerUserId: organizer.userId,
      });
      await this.enqueueOutboundReconciliation();
    } catch (error) {
      this.logger.warn(
        `Teams meeting sync failed for live training ${row.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.saveError(row.id, current, this.getErrorCode(error));
    }
  }

  private readState(metadata: unknown): LiveTrainingTeamsState | null {
    const teams = (metadata as { teams?: LiveTrainingTeamsState } | null)?.teams;

    return teams ?? null;
  }

  private async findOrganizer(liveTrainingId: UUIDType, authorId: UUIDType) {
    const hostIds = await this.microsoftCalendarRepository.listLiveTrainingHostIds(liveTrainingId);

    for (const userId of [authorId, ...hostIds.filter((hostId) => hostId !== authorId)]) {
      const connection = await this.microsoftCalendarRepository.getConnectionByUserId(userId);

      if (connection) return { userId, connection };
    }

    return null;
  }

  private async getAccessToken(
    connection: NonNullable<
      Awaited<ReturnType<MicrosoftCalendarRepository["getConnectionByUserId"]>>
    >,
  ) {
    const refreshToken = this.microsoftCalendarTokenEncryptionService.decrypt(connection);
    const token = await this.microsoftGraphApiClient.refreshAccessToken(
      refreshToken,
      MICROSOFT_TEAMS_MEETING_SCOPES,
    );

    if (token.refresh_token && token.refresh_token !== refreshToken) {
      await this.microsoftCalendarRepository.updateConnection(
        connection.id,
        this.microsoftCalendarTokenEncryptionService.encrypt(token.refresh_token),
      );
    }

    return token.access_token;
  }

  private async removeMeeting(liveTrainingId: UUIDType, current: LiveTrainingTeamsState) {
    if (current.meetingId && current.organizerUserId) {
      try {
        const connection = await this.microsoftCalendarRepository.getConnectionByUserId(
          current.organizerUserId,
        );

        if (connection) {
          const accessToken = await this.getAccessToken(connection);

          await this.microsoftGraphApiClient.deleteOnlineMeeting(accessToken, current.meetingId);
        }
      } catch (error) {
        if (!(error instanceof MicrosoftGraphError) || error.statusCode !== 404) {
          this.logger.warn(
            `Could not delete Teams meeting for live training ${liveTrainingId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    await this.microsoftCalendarRepository.saveLiveTrainingTeamsState(liveTrainingId, {
      requested: current.requested,
      status: LIVE_TRAINING_TEAMS_STATUSES.PENDING,
    });
    await this.enqueueOutboundReconciliation();
  }

  private async saveError(
    liveTrainingId: UUIDType,
    current: LiveTrainingTeamsState,
    errorCode: LiveTrainingTeamsErrorCode,
  ) {
    await this.microsoftCalendarRepository.saveLiveTrainingTeamsState(liveTrainingId, {
      ...current,
      status: LIVE_TRAINING_TEAMS_STATUSES.ERROR,
      errorCode,
    });
  }

  private getErrorCode(error: unknown): LiveTrainingTeamsErrorCode {
    if (
      error instanceof MicrosoftGraphError &&
      (error.authenticationFailure || error.adminConsentRequired || error.statusCode === 403)
    ) {
      return LIVE_TRAINING_TEAMS_ERROR_CODES.AUTHORIZATION_REQUIRED;
    }

    return LIVE_TRAINING_TEAMS_ERROR_CODES.FAILED;
  }

  private getTitle(title: unknown, baseLanguage: string) {
    const localized = title as Record<string, string> | null;

    return localized?.[baseLanguage] || Object.values(localized ?? {})[0] || "Mentingo live training";
  }

  private async enqueueOutboundReconciliation() {
    const connections = await this.microsoftCalendarRepository.listOutboundConnections();

    for (const connection of connections) {
      await this.microsoftCalendarSyncQueueService.enqueueOutbound({
        tenantId: connection.tenantId,
        connectionId: connection.id,
        reason: MICROSOFT_CALENDAR_SYNC_REASONS.RECONCILIATION,
      });
    }
  }
}
