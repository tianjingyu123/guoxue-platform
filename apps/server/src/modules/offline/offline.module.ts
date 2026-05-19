import { Module } from "@nestjs/common";
import { OfflineService } from "./offline.service";
import { OfflineController } from "./offline.controller";
import { OfflineStationDashboardController } from "./offline-station-dashboard.controller";
import { OfflineStationDashboardService } from "./offline-station-dashboard.service";

@Module({
  controllers: [OfflineController, OfflineStationDashboardController],
  providers: [OfflineService, OfflineStationDashboardService],
  exports: [OfflineService, OfflineStationDashboardService],
})
export class OfflineModule {}
