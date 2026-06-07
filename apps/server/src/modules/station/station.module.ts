import { Module } from "@nestjs/common";
import { StationService } from "./station.service";
import { StationController } from "./station.controller";
import { StationDashboardController, OperatorDashboardController } from "./station-dashboard.controller";
import { StationDashboardService } from "./station-dashboard.service";
import { AdminReferralController } from "./admin-referral.controller";
import { AdminReferralService } from "./admin-referral.service";
import { PromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";
import { StationPaipanSyncService } from "./station-paipan-sync.service";
import { TenantController } from "./tenant.controller";
import { ContentSupplyController } from "./content-supply.controller";
import { RedisModule } from "../../redis/redis.module";

@Module({
  imports: [RedisModule],
  controllers: [StationController, AdminReferralController, PromotionController, StationDashboardController, OperatorDashboardController, TenantController, ContentSupplyController],
  providers: [StationService, AdminReferralService, PromotionService, StationDashboardService, StationPaipanSyncService],
  exports: [StationService, AdminReferralService, PromotionService, StationDashboardService, StationPaipanSyncService],
})
export class StationModule {}
