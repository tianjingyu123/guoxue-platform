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
import { LivePresenceService } from "./live-presence.service";
import { LiveMixingService } from "./live-mixing.service";
import { TrtcCallbackGuard } from "../../common/trtc-callback.guard";
import { LivePublicationService } from "./live-publication.service";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { LiveMediaEvidenceRepository } from "./live-media-evidence.repository";
import { LiveMediaCredentialRepository } from "./live-media-credential.repository";
import { LiveMediaStopRepository } from "./live-media-stop.repository";
import { LiveCssStopClient } from "./live-css-stop.client";
import { LiveMediaStopDispatcher } from "./live-media-stop-dispatcher";
import { LiveMediaCompletionService } from "./live-media-completion.service";
import { LiveMediaStopWorker } from "./live-media-stop.worker";
import { LiveMediaClosureAdminController } from "./live-media-closure-admin.controller";
import { LiveMediaClosureAdminService } from "./live-media-closure-admin.service";
import { ConsultMediaEvidenceModule } from "../consult-call/consult-media-evidence.module";

@Module({
  // NotificationModule：开播时给预约用户发圈内通知（LIVE 类·V0 待办 #36/#25）
  // ImModule：开播时创建腾讯 IM AVChatRoom 弹幕群（fail-open·未配置不阻断开播）
  imports: [WebhookModule, CoinModule, RevenueModule, AuditModule, NotificationModule, ImModule, CircleModule, ConsultMediaEvidenceModule],
  controllers: [LiveController, LiveDashboardController, LiveMediaClosureAdminController],
  providers: [LiveService, LivePublicationService, LiveMediaEvidenceRepository, LiveMediaCredentialRepository, LiveMediaStopRepository,
    LiveCssStopClient, LiveMediaStopDispatcher, LiveMediaCompletionService, LiveMediaStopWorker, LiveMediaClosureAdminService,
    CircleCapabilityQuotaRepository, CircleCapabilityQuotaService, LivePresenceService, LiveMixingService, TrtcCallbackGuard, LiveQualityService, LiveStreamService, LiveDashboardService, LiveDataCollectorService, LiveReportService],
  exports: [LiveService, LiveStreamService],
})
export class LiveModule {}
