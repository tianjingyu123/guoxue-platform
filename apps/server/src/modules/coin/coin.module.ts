import { Module } from "@nestjs/common";
import { CoinService } from "./coin.service";
import { CoinController } from "./coin.controller";
import { RedisModule } from "../../redis/redis.module";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";

@Module({
  imports: [RedisModule, CommissionModule, SystemModule, FundApprovalCoreModule],
  controllers: [CoinController],
  providers: [CoinService, ActiveUserGuard],
  exports: [CoinService],
})
export class CoinModule {}
