import { Module, forwardRef } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { LogisticsService } from "./logistics.service";
import { ShopController } from "./shop.controller";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";
import { CoinModule } from "../coin/coin.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [CommissionModule, SystemModule, forwardRef(() => CoinModule), WebhookModule],
  controllers: [ShopController],
  providers: [ShopService, WechatPayService, AlipayService, UnionpayService, LogisticsService],
  exports: [ShopService, WechatPayService, AlipayService, UnionpayService, LogisticsService],
})
export class ShopModule {}
