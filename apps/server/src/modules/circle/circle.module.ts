import { Module } from "@nestjs/common";
import { CircleService } from "./circle.service";
import { CircleSharedService } from "./services/circle-shared.service";
import { CircleCoreService } from "./services/circle-core.service";
import { CircleMembershipService } from "./services/circle-membership.service";
import { CirclePostService } from "./services/circle-post.service";
import { CircleExpertService } from "./services/circle-expert.service";
import { CircleInsightService } from "./services/circle-insight.service";
import { CircleController } from "./circle.controller";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { CircleKnowledgeController } from "./circle-knowledge.controller";
import { CircleAssistantService } from "./circle-assistant.service";
import { CircleAssistantController } from "./circle-assistant.controller";
import { CircleDashboardController } from "./circle-dashboard.controller";
import { CircleDashboardService } from "./circle-dashboard.service";
import { CircleBackendController } from "./circle-backend.controller";
import { CircleGovernanceService } from "./governance/circle-governance.service";
import { CircleGovernanceController } from "./governance/circle-governance.controller";
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
import { TrackModule } from "../track/track.module";
import { CirclePublishGrantController } from "./circle-publish-grant.controller";
import { CirclePublishGrantService } from "./circle-publish-grant.service";
import { CircleCapabilityService } from "./circle-capability.service";
import { CircleCapabilityController } from "./circle-capability.controller";
import { CircleCapabilityRepository } from "./circle-capability.repository";
import { CircleCapabilityEligibilityService } from "./circle-capability-eligibility.service";
import { CircleConsultVisibilityService } from "./circle-consult-visibility.service";

@Module({
  imports: [AiGatewayModule, CoinModule, CommissionModule, NotificationModule, PricingModule, AuditModule, TrackModule],
  // 独立发布授权仅管理发布者资格；读取内容仍沿用各业务既有可见性规则。
  controllers: [CircleController, CircleKnowledgeController, CircleAssistantController, CircleDashboardController, CircleBackendController, CircleGovernanceController, CirclePublishGrantController, CircleCapabilityController],
  providers: [CircleService, CircleSharedService, CircleCoreService, CircleMembershipService, CirclePostService, CircleExpertService, CircleConsultVisibilityService, CircleInsightService, CircleGovernanceService, CircleKnowledgeService, CircleAssistantService, CircleDashboardService, CircleKnowledgeTask, UgcKnowledgeService, UgcKnowledgeTask, StationIsolationGuard, CirclePublishGrantService, CircleCapabilityService, CircleCapabilityRepository, CircleCapabilityEligibilityService],
  exports: [CircleService, CircleGovernanceService, CircleKnowledgeService, CircleAssistantService, UgcKnowledgeService, CirclePublishGrantService, CircleCapabilityService],
})
export class CircleModule {}
