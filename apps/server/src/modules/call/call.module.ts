import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallController } from "./call.controller";
import { TrtcService } from "./trtc.service";
import { CoinModule } from "../coin/coin.module";
import { RevenueModule } from "../revenue/revenue.module";

@Module({
  imports: [CoinModule, RevenueModule],
  controllers: [CallController],
  providers: [CallService, TrtcService],
  exports: [CallService],
})
export class CallModule {}
