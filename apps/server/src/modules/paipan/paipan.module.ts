import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";
import { PaipanAiService } from "./paipan-ai.service";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeController } from "./bazi-knowledge.controller";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AiGatewayModule],
  controllers: [PaipanController, BaziKnowledgeController],
  providers: [PaipanService, PaipanAiService, BaziKnowledgeService, BaziKnowledgeSeeder],
  exports: [PaipanService, PaipanAiService, BaziKnowledgeService],
})
export class PaipanModule {}
