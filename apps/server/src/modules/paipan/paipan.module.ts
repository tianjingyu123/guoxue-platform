import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";
import { PaipanAiService } from "./paipan-ai.service";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeController } from "./bazi-knowledge.controller";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { ZiweiKnowledgeService } from "./ziwei-knowledge.service";
import { ZiweiKnowledgeController } from "./ziwei-knowledge.controller";
import { ZiweiKnowledgeSeeder } from "./ziwei-knowledge-seeder.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CoinModule } from "../coin/coin.module";

@Module({
  imports: [AiGatewayModule, CoinModule],
  controllers: [PaipanController, BaziKnowledgeController, ZiweiKnowledgeController],
  providers: [PaipanService, PaipanAiService, BaziKnowledgeService, BaziKnowledgeSeeder, ZiweiKnowledgeService, ZiweiKnowledgeSeeder],
  exports: [PaipanService, PaipanAiService, BaziKnowledgeService, ZiweiKnowledgeService],
})
export class PaipanModule {}
