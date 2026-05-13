import { Module } from "@nestjs/common";
import { CircleService } from "./circle.service";
import { CircleController } from "./circle.controller";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { CircleKnowledgeController } from "./circle-knowledge.controller";
import { CircleAssistantService } from "./circle-assistant.service";
import { CircleAssistantController } from "./circle-assistant.controller";
import { CircleKnowledgeTask } from "./circle-knowledge.task";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AiGatewayModule],
  controllers: [
    CircleController,
    CircleKnowledgeController,
    CircleAssistantController,
  ],
  providers: [
    CircleService,
    CircleKnowledgeService,
    CircleAssistantService,
    CircleKnowledgeTask,
  ],
  exports: [CircleService, CircleKnowledgeService, CircleAssistantService],
})
export class CircleModule {}
