import { Module } from "@nestjs/common";
import { StationService } from "./station.service";
import { StationController } from "./station.controller";
import { StationDashboardController, OperatorDashboardController, StationAdminOverviewController } from "./station-dashboard.controller";
import { StationDashboardService } from "./station-dashboard.service";
import { AdminReferralController } from "./admin-referral.controller";
import { AdminReferralService } from "./admin-referral.service";
import { PromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";
import { StationPaipanSyncService } from "./station-paipan-sync.service";
import { TeamTaskService } from "./team-task.service";
import { StationMicroPageController } from "./station-micro-page.controller";
import { StationPinnedController } from "./station-pinned.controller";
import { StationPinnedService } from "./station-pinned.service";
import { StationBillingService } from "./station-billing.service";
import { RedisModule } from "../../redis/redis.module";
import { MarketingModule } from "../marketing/marketing.module";
import { TrackModule } from "../track/track.module";

@Module({
  imports: [RedisModule, MarketingModule, TrackModule],
  controllers: [StationController, AdminReferralController, PromotionController, StationDashboardController, OperatorDashboardController, StationAdminOverviewController, StationMicroPageController, StationPinnedController],
  providers: [StationService, AdminReferralService, PromotionService, StationDashboardService, StationPaipanSyncService, TeamTaskService, StationPinnedService, StationBillingService],
  exports: [StationService, AdminReferralService, PromotionService, StationDashboardService, StationPaipanSyncService, TeamTaskService, StationBillingService],
})
export class StationModule {}
