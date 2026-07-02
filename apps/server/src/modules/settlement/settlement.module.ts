import { Module } from "@nestjs/common";
import { SettlementService } from "./settlement.service";
import { SettlementReconcileService } from "./settlement-reconcile.service";

@Module({
  providers: [SettlementService, SettlementReconcileService],
  exports: [SettlementService],
})
export class SettlementModule {}
