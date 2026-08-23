import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";
import { PaipanAiService } from "./paipan-ai.service";
import { CoupleService } from "./couple.service";
import { CoupleController } from "./couple.controller";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeController } from "./bazi-knowledge.controller";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { ZiweiKnowledgeService } from "./ziwei-knowledge.service";
import { ZiweiKnowledgeController } from "./ziwei-knowledge.controller";
import { ZiweiKnowledgeSeeder } from "./ziwei-knowledge-seeder.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CoinModule } from "../coin/coin.module";
import { NativePaipanGuard, PaipanRuntimeService } from "../../common/paipan-runtime.service";

@Module({
  imports: [AiGatewayModule, CoinModule],
  controllers: [PaipanController, CoupleController, BaziKnowledgeController, ZiweiKnowledgeController],
  providers: [PaipanService, PaipanAiService, CoupleService, BaziKnowledgeService, BaziKnowledgeSeeder, ZiweiKnowledgeService, ZiweiKnowledgeSeeder, PaipanRuntimeService, NativePaipanGuard],
  exports: [PaipanService, PaipanAiService, BaziKnowledgeService, ZiweiKnowledgeService],
})
export class PaipanModule {}
