import { Module } from "@nestjs/common";
import { PayoutService } from "./payout.service";
import { PayoutController } from "./payout.controller";
import { ShopModule } from "../shop/shop.module";
import { SystemModule } from "../system/system.module";

/** 自动代付（提现出款）—— 资金架构批次3，见 docs/design/资金与分账架构-设计文档-20260714.md */
@Module({
  imports: [ShopModule, SystemModule],
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
