import { Module } from "@nestjs/common";
import { CircleService } from "./circle.service";
import { CircleController } from "./circle.controller";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { CircleKnowledgeController } from "./circle-knowledge.controller";
import { CircleAssistantService } from "./circle-assistant.service";
import { CircleAssistantController } from "./circle-assistant.controller";
import { CircleDashboardController } from "./circle-dashboard.controller";
import { CircleDashboardService } from "./circle-dashboard.service";
import { CircleBackendController } from "./circle-backend.controller";
import { CircleKnowledgeTask } from "./circle-knowledge.task";
import { UgcKnowledgeService } from "./ugc-knowledge.service";
import { UgcKnowledgeTask } from "./ugc-knowledge.task";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CoinModule } from "../coin/coin.module";
import { CommissionModule } from "../commission/commission.module";
import { NotificationModule } from "../notification/notification.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AiGatewayModule, CoinModule, CommissionModule, NotificationModule, PricingModule, AuditModule],
  controllers: [CircleController, CircleKnowledgeController, CircleAssistantController, CircleDashboardController, CircleBackendController],
  providers: [CircleService, CircleKnowledgeService, CircleAssistantService, CircleDashboardService, CircleKnowledgeTask, UgcKnowledgeService, UgcKnowledgeTask, StationIsolationGuard],
  exports: [CircleService, CircleKnowledgeService, CircleAssistantService, UgcKnowledgeService],
})
export class CircleModule {}
