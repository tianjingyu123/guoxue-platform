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
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { SystemModule } from "../system/system.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [SystemModule, PrismaModule],
  controllers: [AiGatewayController, CustomerServiceController, KnowledgeSyncController],
  providers: [
    AiGatewayService,
    ModelRouterService,
    AiLoggerService,
    VectorService,
    RagService,
    KnowledgeSyncService,
    CustomerServiceService,
    DeepSeekAdapter,
  ],
  exports: [AiGatewayService, ModelRouterService, VectorService, RagService, KnowledgeSyncService],
})
export class AiGatewayModule {}
