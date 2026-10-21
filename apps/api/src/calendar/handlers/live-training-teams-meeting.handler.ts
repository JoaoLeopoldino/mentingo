import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { match, P } from "ts-pattern";

import {
  CreateLiveTrainingEvent,
  DeleteLiveTrainingEvent,
  UpdateLiveTrainingEvent,
} from "src/events";

import { LiveTrainingTeamsMeetingService } from "../services/live-training-teams-meeting.service";

type LiveTrainingTeamsEvent =
  | CreateLiveTrainingEvent
  | UpdateLiveTrainingEvent
  | DeleteLiveTrainingEvent;

@EventsHandler(CreateLiveTrainingEvent, UpdateLiveTrainingEvent, DeleteLiveTrainingEvent)
export class LiveTrainingTeamsMeetingHandler implements IEventHandler<LiveTrainingTeamsEvent> {
  constructor(private readonly liveTrainingTeamsMeetingService: LiveTrainingTeamsMeetingService) {}

  async handle(event: LiveTrainingTeamsEvent) {
    const { liveTrainingId } = match(event)
      .with(P.instanceOf(CreateLiveTrainingEvent), ({ liveTrainingCreationData }) => liveTrainingCreationData)
      .with(P.instanceOf(UpdateLiveTrainingEvent), ({ liveTrainingUpdateData }) => liveTrainingUpdateData)
      .with(P.instanceOf(DeleteLiveTrainingEvent), ({ liveTrainingDeleteData }) => liveTrainingDeleteData)
      .exhaustive();

    await this.liveTrainingTeamsMeetingService.syncLiveTraining(liveTrainingId);
  }
}
