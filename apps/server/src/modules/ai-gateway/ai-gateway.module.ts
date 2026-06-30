import { Module } from "@nestjs/common";
import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { VectorService } from "./vector.service";
import { RagService } from "./rag.service";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { KnowledgeSyncController } from "./knowledge-sync.controller";
import { CustomerServiceService } from "./customer-service.service";
import { CustomerServiceController } from "./customer-service.controller";
import { AdminDedupController } from "./admin-dedup.controller";
import { AdminDedupService } from "./admin-dedup.service";
import { AdminModelRoutingController } from "./admin-model-routing.controller";
import { PublishAssistController } from "./publish-assist.controller";
import { PublishAssistService } from "./publish-assist.service";
import { AdminRagController } from "./admin-rag.controller";
import { MediaAiService } from "./media-ai.service";
import { MediaAiController } from "./media-ai.controller";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceController } from "./marketplace.controller";
import { SemanticCacheService } from "./semantic-cache.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { KnowledgeGraphService } from "./knowledge-graph.service";
import { UserKnowledgeService } from "./user-knowledge.service";
import { KnowledgeQualityService } from "./knowledge-quality.service";
import { QualityScorerService } from "./quality-scorer.service";
import { QualityScorerController } from "./quality-scorer.controller";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { ClaudeAdapter } from "./adapters/claude.adapter";
import { QwenAdapter } from "./adapters/qwen.adapter";
import { LocalModelAdapter } from "./adapters/local.adapter";
import { MultiAgentService } from "./adapters/multi-agent.service";
import { MultimodalService } from "./adapters/multimodal.service";
import { EdgeAiService } from "./adapters/edge-ai.service";
import { PlatformKnowledgeService } from "./platform-knowledge.service";
import { PlatformKnowledgeController } from "./platform-knowledge.controller";
import { AiEventBusService } from "./ai-event-bus.service";
import { AiEventBusController } from "./ai-event-bus.controller";
import { CapabilityRegistryService } from "./capability-registry.service";
import { CapabilityRegistryController } from "./capability-registry.controller";
import { DecisionLedgerService } from "./decision-ledger.service";
import { DecisionLedgerController } from "./decision-ledger.controller";
import { CollaborationService } from "./collaboration.service";
import { CollaborationController } from "./collaboration.controller";
import { AnomalyDetectorService } from "./anomaly-detector.service";
import { AnomalyDetectorController } from "./anomaly-detector.controller";
import { DataExplorerService } from "./data-explorer.service";
import { DataExplorerController } from "./data-explorer.controller";
import { SystemModule } from "../system/system.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { TtsModule } from "../tts/tts.module";

@Module({
  imports: [SystemModule, PrismaModule, RedisModule, TtsModule],
  controllers: [AiGatewayController, CustomerServiceController, KnowledgeSyncController, AdminDedupController, AdminModelRoutingController, PublishAssistController, MediaAiController, AdminRagController, MarketplaceController, QualityScorerController, PlatformKnowledgeController, AiEventBusController, CapabilityRegistryController, DecisionLedgerController, CollaborationController, AnomalyDetectorController, DataExplorerController],
  providers: [
    AiGatewayService,
    ModelRouterService,
    AiLoggerService,
    SemanticCacheService,
    StreamUnifierService,
    QualityScorerService,
    VectorService,
    RagService,
    KnowledgeSyncService,
    CustomerServiceService,
    AdminDedupService,
    PublishAssistService,
    MediaAiService,
    MarketplaceService,
    DeepSeekAdapter,
    ClaudeAdapter,
    QwenAdapter,
    LocalModelAdapter,
    MultiAgentService,
    MultimodalService,
    EdgeAiService,
    KnowledgeQualityService,
    KnowledgeGraphService,
    UserKnowledgeService,
    PlatformKnowledgeService,
    AiEventBusService,
    CapabilityRegistryService,
    DecisionLedgerService,
    CollaborationService,
    AnomalyDetectorService,
    DataExplorerService,
  ],
  exports: [AiGatewayService, ModelRouterService, AiLoggerService, VectorService, RagService, KnowledgeSyncService, SemanticCacheService, StreamUnifierService, MultiAgentService, MultimodalService, EdgeAiService, KnowledgeGraphService, UserKnowledgeService, PlatformKnowledgeService, AiEventBusService, CapabilityRegistryService, DecisionLedgerService, CollaborationService, AnomalyDetectorService, DataExplorerService],
})
export class AiGatewayModule {}
