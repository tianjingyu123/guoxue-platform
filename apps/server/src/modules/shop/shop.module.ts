import { Module } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopProductService } from "./shop-product.service";
import { ShopOrderService } from "./shop-order.service";
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopRefundService } from "./shop-refund.service";
import { ShopCouponService } from "./shop-coupon.service";
import { AfterSaleSlaService } from "./after-sale-sla.service";
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
import { AuditModule } from "../audit/audit.module";
import { MemberModule } from "../member/member.module";
import { EntitlementModule } from "../entitlement/entitlement.module";
import { StationPaipanSyncModule } from "../station/station-paipan-sync.module";

@Module({
  imports: [CommissionModule, SystemModule, CoinModule, WebhookModule, HuifuModule, PricingModule, AuditModule, MemberModule, EntitlementModule, StationPaipanSyncModule],
  controllers: [ShopController, AddressController, ProductCategoryController],
  providers: [ShopService, ShopAttributionService, ShopProductService, ShopOrderService, ShopOrderLifecycleService, ShopPaymentService, ShopRefundService, ShopCouponService, AfterSaleSlaService, WechatPayService, AlipayService, UnionpayService, PaymentProviderFactory, LogisticsService, AddressService, ProductCategoryService, ActiveUserGuard, StationIsolationGuard],
  exports: [ShopService, ShopAttributionService, ShopOrderService, ShopCouponService, ShopRefundService, WechatPayService, AlipayService, UnionpayService, LogisticsService, AddressService, ProductCategoryService],
})
export class ShopModule {}
