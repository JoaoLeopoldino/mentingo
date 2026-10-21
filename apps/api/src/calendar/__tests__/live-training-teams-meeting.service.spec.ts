import { MicrosoftGraphError } from "../clients/microsoft-graph-api.client";
import { LiveTrainingTeamsMeetingService } from "../services/live-training-teams-meeting.service";
import {
  LIVE_TRAINING_TEAMS_ERROR_CODES,
  LIVE_TRAINING_TEAMS_STATUSES,
} from "../types/live-training-teams.types";

const liveTrainingId = "11111111-1111-4111-8111-111111111111";
const authorId = "22222222-2222-4222-8222-222222222222";

const buildRow = (metadata: unknown, overrides: Record<string, unknown> = {}) => ({
  id: liveTrainingId,
  authorId,
  metadata,
  deletedAt: null,
  eventDeletedAt: null,
  startsAt: "2026-11-02T09:00:00.000Z",
  endsAt: "2026-11-02T10:00:00.000Z",
  title: { pt: "Segurança em Huíla" },
  baseLanguage: "pt",
  ...overrides,
});

describe("LiveTrainingTeamsMeetingService", () => {
  const repository = {
    getLiveTrainingTeamsState: jest.fn(),
    listLiveTrainingHostIds: jest.fn(),
    getConnectionByUserId: jest.fn(),
    updateConnection: jest.fn(),
    saveLiveTrainingTeamsState: jest.fn(),
    listOutboundConnections: jest.fn(),
  };
  const graph = {
    isTeamsMeetingsEnabled: jest.fn(),
    refreshAccessToken: jest.fn(),
    createOnlineMeeting: jest.fn(),
    updateOnlineMeeting: jest.fn(),
    deleteOnlineMeeting: jest.fn(),
  };
  const encryption = { decrypt: jest.fn(), encrypt: jest.fn() };
  const queue = { enqueueOutbound: jest.fn() };
  const service = new LiveTrainingTeamsMeetingService(
    repository as never,
    graph as never,
    encryption as never,
    queue as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    graph.isTeamsMeetingsEnabled.mockResolvedValue(true);
    graph.refreshAccessToken.mockResolvedValue({ access_token: "token" });
    encryption.decrypt.mockReturnValue("refresh");
    repository.listLiveTrainingHostIds.mockResolvedValue([]);
    repository.getConnectionByUserId.mockResolvedValue({ id: "connection-1" });
    repository.listOutboundConnections.mockResolvedValue([{ id: "connection-1", tenantId: "t1" }]);
  });

  it("creates one meeting with the Teams scope and stores the join link", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow({ teams: { requested: true, status: "pending" } }),
    );
    graph.createOnlineMeeting.mockResolvedValue({
      id: "meeting-1",
      joinWebUrl: "https://teams.microsoft.com/l/meetup-join/abc",
    });

    await service.syncLiveTraining(liveTrainingId);

    expect(graph.refreshAccessToken).toHaveBeenCalledWith("refresh", ["OnlineMeetings.ReadWrite"]);
    expect(graph.createOnlineMeeting).toHaveBeenCalledWith("token", {
      subject: "Segurança em Huíla",
      startDateTime: "2026-11-02T09:00:00.000Z",
      endDateTime: "2026-11-02T10:00:00.000Z",
    });
    expect(repository.saveLiveTrainingTeamsState).toHaveBeenCalledWith(liveTrainingId, {
      requested: true,
      status: LIVE_TRAINING_TEAMS_STATUSES.READY,
      meetingId: "meeting-1",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/abc",
      organizerUserId: authorId,
    });
    expect(queue.enqueueOutbound).toHaveBeenCalledTimes(1);
  });

  it("updates the existing meeting instead of creating another one", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow({
        teams: {
          requested: true,
          status: "ready",
          meetingId: "meeting-1",
          joinUrl: "https://teams.microsoft.com/l/meetup-join/abc",
          organizerUserId: authorId,
        },
      }),
    );

    await service.syncLiveTraining(liveTrainingId);

    expect(graph.updateOnlineMeeting).toHaveBeenCalledWith("token", "meeting-1", expect.any(Object));
    expect(graph.createOnlineMeeting).not.toHaveBeenCalled();
  });

  it("deletes the meeting and clears the link when the session is deleted", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow(
        {
          teams: {
            requested: true,
            status: "ready",
            meetingId: "meeting-1",
            joinUrl: "https://teams.microsoft.com/l/meetup-join/abc",
            organizerUserId: authorId,
          },
        },
        { deletedAt: "2026-11-01T00:00:00.000Z" },
      ),
    );

    await service.syncLiveTraining(liveTrainingId);

    expect(graph.deleteOnlineMeeting).toHaveBeenCalledWith("token", "meeting-1");
    expect(repository.saveLiveTrainingTeamsState).toHaveBeenCalledWith(liveTrainingId, {
      requested: true,
      status: LIVE_TRAINING_TEAMS_STATUSES.PENDING,
    });
  });

  it("reports when no host has a connected Microsoft account", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow({ teams: { requested: true, status: "pending" } }),
    );
    repository.getConnectionByUserId.mockResolvedValue(null);

    await service.syncLiveTraining(liveTrainingId);

    expect(graph.createOnlineMeeting).not.toHaveBeenCalled();
    expect(repository.saveLiveTrainingTeamsState).toHaveBeenCalledWith(
      liveTrainingId,
      expect.objectContaining({
        status: LIVE_TRAINING_TEAMS_STATUSES.ERROR,
        errorCode: LIVE_TRAINING_TEAMS_ERROR_CODES.NO_CONNECTED_ORGANIZER,
      }),
    );
  });

  it("asks for a new authorization when the Teams permission was not granted", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow({ teams: { requested: true, status: "pending" } }),
    );
    graph.refreshAccessToken.mockRejectedValue(new MicrosoftGraphError("denied", true, false, 400));

    await service.syncLiveTraining(liveTrainingId);

    expect(repository.saveLiveTrainingTeamsState).toHaveBeenCalledWith(
      liveTrainingId,
      expect.objectContaining({
        errorCode: LIVE_TRAINING_TEAMS_ERROR_CODES.AUTHORIZATION_REQUIRED,
      }),
    );
  });

  it("does nothing for live trainings that never asked for Teams", async () => {
    repository.getLiveTrainingTeamsState.mockResolvedValue(buildRow({}));

    await service.syncLiveTraining(liveTrainingId);

    expect(repository.saveLiveTrainingTeamsState).not.toHaveBeenCalled();
    expect(graph.createOnlineMeeting).not.toHaveBeenCalled();
  });

  it("flags the feature as disabled instead of calling Microsoft", async () => {
    graph.isTeamsMeetingsEnabled.mockResolvedValue(false);
    repository.getLiveTrainingTeamsState.mockResolvedValue(
      buildRow({ teams: { requested: true, status: "pending" } }),
    );

    await service.syncLiveTraining(liveTrainingId);

    expect(graph.refreshAccessToken).not.toHaveBeenCalled();
    expect(repository.saveLiveTrainingTeamsState).toHaveBeenCalledWith(
      liveTrainingId,
      expect.objectContaining({ errorCode: LIVE_TRAINING_TEAMS_ERROR_CODES.DISABLED }),
    );
  });
});
