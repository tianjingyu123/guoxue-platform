import { Module } from "@nestjs/common";
import { SettlementService } from "./settlement.service";
import { SettlementReconcileService } from "./settlement-reconcile.service";
import { SettlementBalanceReconcileService } from "./settlement-balance-reconcile.service";
import { SettlementRuleAdminService } from "./settlement-rule-admin.service";
import { LedgerBalanceService } from "./ledger-balance.service";
import { SettlementFreezeService } from "./settlement-freeze.service";
import { SettlementController } from "./settlement.controller";

@Module({
  controllers: [SettlementController],
  providers: [
    SettlementService,
    SettlementReconcileService,
    SettlementBalanceReconcileService,
    SettlementRuleAdminService,
    LedgerBalanceService,
    SettlementFreezeService,
  ],
  exports: [SettlementService, LedgerBalanceService, SettlementFreezeService],
})
export class SettlementModule {}
