import { Module } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { ShopController } from "./shop.controller";
import { CommissionModule } from "../commission/commission.module";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [CommissionModule, SystemModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
