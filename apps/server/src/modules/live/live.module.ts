import { Module } from "@nestjs/common";
import { LiveService } from "./live.service";
import { LiveQualityService } from "./live-quality.service";
import { LiveStreamService } from "./live-stream.service";
import { LiveController } from "./live.controller";
import { LiveDashboardController } from "./live-dashboard.controller";
import { LiveDashboardService } from "./live-dashboard.service";
import { LiveDataCollectorService } from "./live-data-collector.service";
import { LiveReportService } from "./live-report.service";
import { WebhookModule } from "../webhook/webhook.module";
import { CoinModule } from "../coin/coin.module";
import { RevenueModule } from "../revenue/revenue.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationModule } from "../notification/notification.module";
import { ImModule } from "../im/im.module";
import { CircleModule } from "../circle/circle.module";

@Module({
  // NotificationModule：开播时给预约用户发圈内通知（LIVE 类·V0 待办 #36/#25）
  // ImModule：开播时创建腾讯 IM AVChatRoom 弹幕群（fail-open·未配置不阻断开播）
  imports: [WebhookModule, CoinModule, RevenueModule, AuditModule, NotificationModule, ImModule, CircleModule],
  controllers: [LiveController, LiveDashboardController],
  providers: [LiveService, LiveQualityService, LiveStreamService, LiveDashboardService, LiveDataCollectorService, LiveReportService],
  exports: [LiveService, LiveStreamService],
})
export class LiveModule {}
