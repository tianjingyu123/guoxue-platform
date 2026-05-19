import { Module } from "@nestjs/common";
import { CompetitionService } from "./competition.service";
import { GradingEngineService } from "./grading-engine.service";
import {
  CompetitionAdminController,
  CompetitionPublicController,
  CompetitionJudgeController,
} from "./competition.controller";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [SystemModule],
  controllers: [CompetitionAdminController, CompetitionPublicController, CompetitionJudgeController],
  providers: [CompetitionService, GradingEngineService],
  exports: [CompetitionService, GradingEngineService],
})
export class CompetitionModule {}
