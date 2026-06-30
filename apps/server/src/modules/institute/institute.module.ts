import { Module } from "@nestjs/common";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { InstituteContentController } from "./content.controller";
import { InstituteContentService } from "./content.service";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";

@Module({
  imports: [FundApprovalCoreModule],
  controllers: [InstituteController, InstituteContentController],
  providers: [InstituteService, InstituteContentService],
  exports: [InstituteService, InstituteContentService],
})
export class InstituteModule {}
