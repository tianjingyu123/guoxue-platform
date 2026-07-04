import { Module } from "@nestjs/common";
import { UserGrowthService } from "./user-growth.service";
import { ContentExpService } from "./content-exp.service";
import { UserGrowthController, GrowthCardController } from "./user-growth.controller";

@Module({
  controllers: [UserGrowthController, GrowthCardController],
  providers: [UserGrowthService, ContentExpService],
  exports: [UserGrowthService, ContentExpService],
})
export class UserGrowthModule {}
