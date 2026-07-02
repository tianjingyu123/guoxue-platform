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

@Module({
  imports: [WebhookModule, CoinModule, RevenueModule],
  controllers: [LiveController, LiveDashboardController],
  providers: [LiveService, LiveQualityService, LiveStreamService, LiveDashboardService, LiveDataCollectorService, LiveReportService],
  exports: [LiveService, LiveStreamService],
})
export class LiveModule {}
