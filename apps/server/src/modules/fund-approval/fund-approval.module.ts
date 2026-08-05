import { Module } from "@nestjs/common";
import { FundApprovalCoreModule } from "./fund-approval-core.module";
import { FundApprovalController } from "./fund-approval.controller";
import { FundApprovalExecutor } from "./fund-approval.executor";
import { InstituteModule } from "../institute/institute.module";
import { HuifuModule } from "../huifu/huifu.module";
import { CoinModule } from "../coin/coin.module";
import { CommissionModule } from "../commission/commission.module";
import { StationModule } from "../station/station.module";
import { SettlementModule } from "../settlement/settlement.module";
import { ShopModule } from "../shop/shop.module";

/**
 * 资金审批「执行」模块：组合核心服务与各资金业务模块，
 * 在审批通过时调用各模块的真实执行方法。
 * 只被 AppModule 导入，不被任何业务模块导入 → 无循环依赖。
 */
@Module({
  imports: [
    FundApprovalCoreModule,
    InstituteModule,
    HuifuModule,
    CoinModule,
    CommissionModule,
    StationModule,
    SettlementModule,
    ShopModule,
  ],
  controllers: [FundApprovalController],
  providers: [FundApprovalExecutor],
})
export class FundApprovalModule {}
