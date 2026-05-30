import { Module, forwardRef } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { ShopModule } from "../shop/shop.module";

@Module({
  imports: [forwardRef(() => ShopModule)],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
