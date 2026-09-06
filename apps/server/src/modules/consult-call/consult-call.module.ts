import { Module } from "@nestjs/common";
import { ConsultCallService } from "./consult-call.service";
import { ConsultCallController } from "./consult-call.controller";
import { CoinModule } from "../coin/coin.module";
import { RevenueModule } from "../revenue/revenue.module";
import { CircleModule } from "../circle/circle.module";
import { ConsultCallResourceService } from "./consult-call-resource.service";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { ConsultTrtcStopClient } from "./consult-trtc-stop.client";
import { ConsultTrtcStopDispatcher } from "./consult-trtc-stop.dispatcher";
import { ConsultTrtcStopWorker } from "./consult-trtc-stop.worker";
import { ConsultMediaStatusService } from "./consult-media-status.service";
import { ConsultMediaCompletionService } from "./consult-media-completion.service";
import { ConsultMediaCompletionWorker } from "./consult-media-completion.worker";
import { ConsultTrtcFinalProbeClient } from "./consult-trtc-final-probe.client";
import { ConsultTrtcFinalProbeDispatcher } from "./consult-trtc-final-probe.dispatcher";
import { ConsultBudgetWorker } from './consult-budget.worker';

@Module({
  imports: [CoinModule, RevenueModule, CircleModule],
  controllers: [ConsultCallController],
  providers: [ConsultCallService, ConsultCallResourceService, CircleCapabilityQuotaRepository, CircleCapabilityQuotaService,
    ConsultTrtcStopClient, ConsultTrtcStopDispatcher, ConsultTrtcStopWorker, ConsultMediaStatusService,
    ConsultMediaCompletionService, ConsultMediaCompletionWorker, ConsultTrtcFinalProbeClient, ConsultTrtcFinalProbeDispatcher, ConsultBudgetWorker],
})
export class ConsultCallModule {}
