import { Module } from "@nestjs/common";
import { MarketingService } from "./marketing.service";
import { MarketingController } from "./marketing.controller";
import { ShopModule } from "../shop/shop.module";

@Module({
  imports: [ShopModule], // 付费拼团下单委托 ShopService.createGroupBuyOrder（单向依赖，shop 不反向依赖 marketing）
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
