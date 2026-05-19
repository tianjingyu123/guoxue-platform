import { Module, forwardRef } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { LogisticsService } from "./logistics.service";
import { ShopController } from "./shop.controller";
import { AddressController } from "./address.controller";
import { AddressService } from "./address.service";
import { ProductCategoryController } from "./category.controller";
import { ProductCategoryService } from "./product-category.service";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";
import { CoinModule } from "../coin/coin.module";
import { WebhookModule } from "../webhook/webhook.module";
import { HuifuModule } from "../huifu/huifu.module";

@Module({
  imports: [CommissionModule, SystemModule, forwardRef(() => CoinModule), WebhookModule, HuifuModule],
  controllers: [ShopController, AddressController, ProductCategoryController],
  providers: [ShopService, WechatPayService, AlipayService, UnionpayService, LogisticsService, AddressService, ProductCategoryService],
  exports: [ShopService, WechatPayService, AlipayService, UnionpayService, LogisticsService, AddressService, ProductCategoryService],
})
export class ShopModule {}
