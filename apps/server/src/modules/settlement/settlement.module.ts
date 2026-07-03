import { Module } from "@nestjs/common";
import { SettlementService } from "./settlement.service";
import { SettlementReconcileService } from "./settlement-reconcile.service";
import { SettlementRuleAdminService } from "./settlement-rule-admin.service";
import { SettlementController } from "./settlement.controller";

@Module({
  controllers: [SettlementController],
  providers: [SettlementService, SettlementReconcileService, SettlementRuleAdminService],
  exports: [SettlementService],
})
export class SettlementModule {}
