import { PaipanEngineController, PaipanEngineThrottleGuard } from "./engine/paipan-engine.controller";
import { PaipanEngineService } from "./engine/paipan-engine.service";
import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";
import { PaipanAiService } from "./paipan-ai.service";
import { PaipanReportService } from "./paipan-report.service";
import { PaipanCaseFeedbackService } from "./paipan-case-feedback.service";
import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";
import { PaipanReportDialogueService } from "./paipan-report-dialogue.service";
import { PaipanReportKnowledgeController } from "./paipan-report-knowledge.controller";
import { CoupleService } from "./couple.service";
import { CoupleController } from "./couple.controller";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeController } from "./bazi-knowledge.controller";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { ZiweiKnowledgeService } from "./ziwei-knowledge.service";
import { ZiweiKnowledgeController } from "./ziwei-knowledge.controller";
import { ZiweiKnowledgeSeeder } from "./ziwei-knowledge-seeder.service";
import { PaipanReportKnowledgeSeeder } from "./paipan-report-knowledge-seeder.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CoinModule } from "../coin/coin.module";
import { NativePaipanGuard, PaipanRuntimeService } from "../../common/paipan-runtime.service";
import { SearchModule } from "../search/search.module";
import { VoiceModule } from "../voice/voice.module";
import { PreferredNameService } from "../dialogue/preferred-name.service";

@Module({
  // VoiceModule：报告生成后要发放附带的 30 分钟语音时长（VoiceModule 不反向依赖 paipan，无循环）
  imports: [AiGatewayModule, CoinModule, SearchModule, VoiceModule],
  controllers: [PaipanController, PaipanEngineController, CoupleController, BaziKnowledgeController, ZiweiKnowledgeController, PaipanReportKnowledgeController],
  providers: [PreferredNameService, PaipanEngineService, PaipanEngineThrottleGuard, PaipanService, PaipanAiService, PaipanReportService, PaipanReportKnowledgeService, PaipanReportKnowledgeSeeder, PaipanReportDialogueService, PaipanCaseFeedbackService, CoupleService, BaziKnowledgeService, BaziKnowledgeSeeder, ZiweiKnowledgeService, ZiweiKnowledgeSeeder, PaipanRuntimeService, NativePaipanGuard],
  exports: [PaipanService, PaipanAiService, PaipanReportService, PaipanCaseFeedbackService, BaziKnowledgeService, ZiweiKnowledgeService],
})
export class PaipanModule {}
