import { Module } from "@nestjs/common";

import { LocalizationModule } from "src/localization/localization.module";

import { CompetenciesController } from "./competencies.controller";
import { CompetenciesRepository } from "./competencies.repository";
import { CompetenciesService } from "./competencies.service";
import { CompetencyFrameworksRepository } from "./competency-frameworks.repository";
import { DevelopmentPlansRepository } from "./development-plans.repository";
@Module({
  imports: [LocalizationModule],
  controllers: [CompetenciesController],
  providers: [
    CompetenciesRepository,
    CompetenciesService,
    DevelopmentPlansRepository,
    CompetencyFrameworksRepository,
  ],
})
export class CompetenciesModule {}
