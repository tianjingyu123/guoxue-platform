import { Module } from "@nestjs/common";
import { OfflineService } from "./offline.service";
import { OfflineController } from "./offline.controller";
import { OfflineEventController } from "./offline-event.controller";
import { OfflineEventService } from "./offline-event.service";
import { OfflineStationDashboardController } from "./offline-station-dashboard.controller";
import { OfflineStationDashboardService } from "./offline-station-dashboard.service";
import { OfflineReminderService } from "./offline-reminder.service";
import { TrackModule } from "../track/track.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [TrackModule, NotificationModule], // 学员洞察复用公共 InsightService（画像聚合/时间线摘要）；通知触点复用 NotificationService
  controllers: [OfflineController, OfflineEventController, OfflineStationDashboardController],
  providers: [OfflineService, OfflineEventService, OfflineStationDashboardService, OfflineReminderService],
  exports: [OfflineService, OfflineEventService, OfflineStationDashboardService, OfflineReminderService],
})
export class OfflineModule {}
