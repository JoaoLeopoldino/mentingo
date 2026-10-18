import { Module } from "@nestjs/common";

import { LocalizationModule } from "src/localization/localization.module";

import { CompetenciesController } from "./competencies.controller";
import { CompetenciesRepository } from "./competencies.repository";
import { CompetenciesService } from "./competencies.service";
@Module({
  imports: [LocalizationModule],
  controllers: [CompetenciesController],
  providers: [CompetenciesRepository, CompetenciesService],
})
export class CompetenciesModule {}
