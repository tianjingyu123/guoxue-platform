import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RiskControlService } from "./risk-control.service";
import { DistributionRiskService } from "./distribution-risk.service";
import { RiskControlController } from "./risk-control.controller";
import { AuditModule } from "../audit/audit.module";
import { SettlementModule } from "../settlement/settlement.module";

@Module({
  // AuditModule: 分销风控复用 SensitiveWordService COMPLIANCE_A 词库
  // SettlementModule: DANGER 规则自动冻结站长佣金（SettlementFreezeService）；SystemService 走 @Global SystemModule
  imports: [ScheduleModule, AuditModule, SettlementModule],
  controllers: [RiskControlController],
  providers: [RiskControlService, DistributionRiskService],
  exports: [RiskControlService, DistributionRiskService],
})
export class RiskControlModule {}
