import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { MarketingContentService } from "./marketing-content.service";
import { MarketingContentController } from "./marketing-content.controller";
import { CreationAssistService } from "./creation-assist.service";
import { CreationAssistController } from "./creation-assist.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AiGatewayModule, AuditModule],
  controllers: [AiController, MarketingContentController, CreationAssistController],
  providers: [AiService, MarketingContentService, CreationAssistService],
  exports: [AiService],
})
export class AiModule {}
