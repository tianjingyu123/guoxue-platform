import { Module, forwardRef } from "@nestjs/common";
import { CoinService } from "./coin.service";
import { CoinController } from "./coin.controller";
import { RedisModule } from "../../redis/redis.module";
import { ShopModule } from "../shop/shop.module";

@Module({
  imports: [RedisModule, forwardRef(() => ShopModule)],
  controllers: [CoinController],
  providers: [CoinService],
  exports: [CoinService],
})
export class CoinModule {}
