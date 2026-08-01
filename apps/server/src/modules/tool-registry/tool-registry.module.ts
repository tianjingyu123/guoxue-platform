import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { WannianliModule } from "../wannianli/wannianli.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { ToolRegistryController } from "./tool-registry.controller";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolAiService } from "./tool-ai.service";
import { ToolCalculationService } from "./tool-calculation.service";

@Module({
  imports: [PrismaModule, RedisModule, WannianliModule, AiGatewayModule],
  controllers: [ToolRegistryController],
  providers: [ToolRegistryService, ToolAiService, ToolCalculationService],
  exports: [ToolRegistryService, ToolAiService, ToolCalculationService],
})
export class ToolRegistryModule {}
