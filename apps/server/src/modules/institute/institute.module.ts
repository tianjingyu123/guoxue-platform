import { Module } from "@nestjs/common";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { InstituteContentController, InstituteContentPublicController } from "./content.controller";
import { InstituteContentService } from "./content.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { InstituteBoardService } from "./institute-board.service";
import { LectureArchiveService } from "./lecture-archive.service";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";
import { CoinModule } from "../coin/coin.module";

@Module({
  imports: [FundApprovalCoreModule, CoinModule],
  controllers: [InstituteController, InstituteContentController, InstituteContentPublicController],
  providers: [InstituteService, InstituteContentService, InstituteAssessmentService, InstituteBoardService, LectureArchiveService],
  exports: [InstituteService, InstituteContentService, InstituteAssessmentService, InstituteBoardService, LectureArchiveService],
})
export class InstituteModule {}
