import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RiskControlService } from "./risk-control.service";
import { DistributionRiskService } from "./distribution-risk.service";
import { RiskControlController } from "./risk-control.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ScheduleModule, AuditModule], // AuditModule: 分销风控复用 SensitiveWordService COMPLIANCE_A 词库
  controllers: [RiskControlController],
  providers: [RiskControlService, DistributionRiskService],
  exports: [RiskControlService, DistributionRiskService],
})
export class RiskControlModule {}
