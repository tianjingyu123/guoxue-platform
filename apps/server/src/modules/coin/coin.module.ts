import { Module } from "@nestjs/common";
import { CoinService } from "./coin.service";
import { CoinController } from "./coin.controller";
import { RedisModule } from "../../redis/redis.module";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [RedisModule, CommissionModule, SystemModule],
  controllers: [CoinController],
  providers: [CoinService, ActiveUserGuard],
  exports: [CoinService],
})
export class CoinModule {}
