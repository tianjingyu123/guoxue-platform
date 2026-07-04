import { Module } from "@nestjs/common";
import { CompetitionService } from "./competition.service";
import { CompetitionAdminService } from "./competition-admin.service";
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
  providers: [CompetitionService, CompetitionAdminService, GradingEngineService],
  exports: [CompetitionService, CompetitionAdminService, GradingEngineService],
})
export class CompetitionModule {}
