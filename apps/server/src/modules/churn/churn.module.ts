import { Module } from "@nestjs/common";
import { ChurnService } from "./churn.service";
import { ChurnController } from "./churn.controller";
import { SmsModule } from "../sms/sms.module";
import { MarketingModule } from "../marketing/marketing.module";

@Module({
  // 2026-07-17 审计修复：ChurnService 里 @Optional 注入的 SmsService/MarketingService
  // 此前因缺 imports 恒为 undefined → SMS/COUPON 召回动作从没真执行过却标 COMPLETED。
  imports: [SmsModule, MarketingModule],
  controllers: [ChurnController],
  providers: [ChurnService],
  exports: [ChurnService],
})
export class ChurnModule {}
