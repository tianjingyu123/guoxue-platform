import { Module } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { ShopCouponService } from "./shop-coupon.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { PaymentProviderFactory } from "./payment-factory";
import { LogisticsService } from "./logistics.service";
import { ShopController } from "./shop.controller";
import { AddressController } from "./address.controller";
import { AddressService } from "./address.service";
import { ProductCategoryController } from "./category.controller";
import { ProductCategoryService } from "./product-category.service";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";
import { CoinModule } from "../coin/coin.module";
import { WebhookModule } from "../webhook/webhook.module";
import { HuifuModule } from "../huifu/huifu.module";
import { PricingModule } from "../pricing/pricing.module";

@Module({
  imports: [CommissionModule, SystemModule, CoinModule, WebhookModule, HuifuModule, PricingModule],
  controllers: [ShopController, AddressController, ProductCategoryController],
  providers: [ShopService, ShopCouponService, WechatPayService, AlipayService, UnionpayService, PaymentProviderFactory, LogisticsService, AddressService, ProductCategoryService, ActiveUserGuard, StationIsolationGuard],
  exports: [ShopService, ShopCouponService, WechatPayService, AlipayService, UnionpayService, LogisticsService, AddressService, ProductCategoryService],
})
export class ShopModule {}
