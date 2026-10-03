import { Module } from "@nestjs/common";
import { RevenueService } from "./revenue.service";
import { RevenueController } from "./revenue.controller";
import { SettlementModule } from "../settlement/settlement.module";

@Module({
  imports: [SettlementModule], // 统一总账影子双写（settleLedger）
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
