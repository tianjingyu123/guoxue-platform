import { Module } from "@nestjs/common";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { InstituteContentController, InstituteContentPublicController } from "./content.controller";
import { InstituteContentService } from "./content.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";
import { CoinModule } from "../coin/coin.module";

@Module({
  imports: [FundApprovalCoreModule, CoinModule],
  controllers: [InstituteController, InstituteContentController, InstituteContentPublicController],
  providers: [InstituteService, InstituteContentService, InstituteAssessmentService],
  exports: [InstituteService, InstituteContentService, InstituteAssessmentService],
})
export class InstituteModule {}
