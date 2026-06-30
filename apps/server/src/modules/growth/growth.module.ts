import { Module } from "@nestjs/common";
import { GrowthService } from "./growth.service";
import { GrowthController } from "./growth.controller";

/** 圈子成长体系模块（PrismaModule 全局，无需额外 imports） */
@Module({
  controllers: [GrowthController],
  providers: [GrowthService],
})
export class GrowthModule {}
