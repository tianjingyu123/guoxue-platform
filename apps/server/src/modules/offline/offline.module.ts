import { Module } from "@nestjs/common";
import { OfflineService } from "./offline.service";
import { OfflineController } from "./offline.controller";
import { OfflineStationDashboardController } from "./offline-station-dashboard.controller";
import { OfflineStationDashboardService } from "./offline-station-dashboard.service";
import { TrackModule } from "../track/track.module";

@Module({
  imports: [TrackModule], // 学员洞察复用公共 InsightService（画像聚合/时间线摘要）
  controllers: [OfflineController, OfflineStationDashboardController],
  providers: [OfflineService, OfflineStationDashboardService],
  exports: [OfflineService, OfflineStationDashboardService],
})
export class OfflineModule {}
