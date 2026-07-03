import { Module } from "@nestjs/common";
import { UserGrowthService } from "./user-growth.service";
import { UserGrowthController, GrowthCardController } from "./user-growth.controller";

@Module({
  controllers: [UserGrowthController, GrowthCardController],
  providers: [UserGrowthService],
  exports: [UserGrowthService],
})
export class UserGrowthModule {}
