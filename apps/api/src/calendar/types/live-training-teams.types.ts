export const LIVE_TRAINING_TEAMS_STATUSES = {
  PENDING: "pending",
  READY: "ready",
  ERROR: "error",
} as const;

export type LiveTrainingTeamsStatus =
  (typeof LIVE_TRAINING_TEAMS_STATUSES)[keyof typeof LIVE_TRAINING_TEAMS_STATUSES];

export const LIVE_TRAINING_TEAMS_ERROR_CODES = {
  DISABLED: "liveTraining.teams.errors.disabled",
  NO_CONNECTED_ORGANIZER: "liveTraining.teams.errors.noConnectedOrganizer",
  AUTHORIZATION_REQUIRED: "liveTraining.teams.errors.authorizationRequired",
  FAILED: "liveTraining.teams.errors.failed",
} as const;

export type LiveTrainingTeamsErrorCode =
  (typeof LIVE_TRAINING_TEAMS_ERROR_CODES)[keyof typeof LIVE_TRAINING_TEAMS_ERROR_CODES];

export type LiveTrainingTeamsState = {
  requested: boolean;
  status: LiveTrainingTeamsStatus;
  meetingId?: string;
  joinUrl?: string;
  organizerUserId?: string;
  errorCode?: LiveTrainingTeamsErrorCode;
};

// Learners only receive the join link shortly before the session starts.
export const LIVE_TRAINING_TEAMS_JOIN_LEAD_MS = 15 * 60 * 1000;
