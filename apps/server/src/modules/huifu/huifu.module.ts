import { Module } from "@nestjs/common";
import { HuifuService } from "./huifu.service";
import { HuifuController } from "./huifu.controller";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";

@Module({
  imports: [FundApprovalCoreModule],
  controllers: [HuifuController],
  providers: [HuifuService],
  exports: [HuifuService],
})
export class HuifuModule {}
