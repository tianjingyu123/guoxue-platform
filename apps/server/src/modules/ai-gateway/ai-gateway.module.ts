import { Module } from "@nestjs/common";
import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { VectorService } from "./vector.service";
import { RagService } from "./rag.service";
import { CustomerServiceService } from "./customer-service.service";
import { CustomerServiceController } from "./customer-service.controller";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [SystemModule],
  controllers: [AiGatewayController, CustomerServiceController],
  providers: [
    AiGatewayService,
    ModelRouterService,
    AiLoggerService,
    VectorService,
    RagService,
    CustomerServiceService,
    DeepSeekAdapter,
  ],
  exports: [AiGatewayService, ModelRouterService, VectorService, RagService],
})
export class AiGatewayModule {}
