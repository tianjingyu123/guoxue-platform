import { Module } from "@nestjs/common";
import { UserGrowthService } from "./user-growth.service";
import { UserGrowthController } from "./user-growth.controller";

@Module({
  controllers: [UserGrowthController],
  providers: [UserGrowthService],
  exports: [UserGrowthService],
})
export class UserGrowthModule {}
