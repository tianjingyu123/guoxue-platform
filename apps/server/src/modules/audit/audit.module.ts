import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { ModerationService } from "./moderation.service";
import { ModerationAiService } from "./moderation-ai.service";
import { SensitiveWordService } from "./sensitive-word.service";
import { ReportService } from "./report.service";
import { AuditController } from "./audit.controller";

@Module({
  controllers: [AuditController],
  providers: [AuditService, ModerationService, ModerationAiService, SensitiveWordService, ReportService],
  exports: [AuditService, ModerationService, ModerationAiService, SensitiveWordService, ReportService],
})
export class AuditModule {}
