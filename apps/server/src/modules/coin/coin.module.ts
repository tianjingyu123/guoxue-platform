import { Module } from "@nestjs/common";
import { CoinService } from "./coin.service";
import { CoinController } from "./coin.controller";
import { RedisModule } from "../../redis/redis.module";
import { CommissionModule } from "../commission/commission.module";

@Module({
  imports: [RedisModule, CommissionModule],
  controllers: [CoinController],
  providers: [CoinService],
  exports: [CoinService],
})
export class CoinModule {}
