import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { MarketingContentService } from "./marketing-content.service";
import { MarketingContentController } from "./marketing-content.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AiGatewayModule, AuditModule],
  controllers: [AiController, MarketingContentController],
  providers: [AiService, MarketingContentService],
  exports: [AiService],
})
export class AiModule {}
