import { Module } from "@nestjs/common";
import { GrowthService } from "./growth.service";
import { GrowthController } from "./growth.controller";
import { NotificationModule } from "../notification/notification.module";

/** 圈子成长体系模块（PrismaModule 全局；NotificationModule：入圈审批结果通知申请人） */
@Module({
  imports: [NotificationModule],
  controllers: [GrowthController],
  providers: [GrowthService],
})
export class GrowthModule {}
