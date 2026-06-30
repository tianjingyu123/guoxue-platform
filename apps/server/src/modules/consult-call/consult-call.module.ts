import { Module } from "@nestjs/common";
import { ConsultCallService } from "./consult-call.service";
import { ConsultCallController } from "./consult-call.controller";
import { CoinModule } from "../coin/coin.module";
import { RevenueModule } from "../revenue/revenue.module";

@Module({
  imports: [CoinModule, RevenueModule],
  controllers: [ConsultCallController],
  providers: [ConsultCallService],
})
export class ConsultCallModule {}
