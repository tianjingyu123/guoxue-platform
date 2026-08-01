import { Module } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { FinanceReconcileTask } from "./finance-reconcile.task";
import { ShopModule } from "../shop/shop.module";

@Module({
  imports: [ShopModule],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceReconcileTask],
  exports: [FinanceService],
})
export class FinanceModule {}
