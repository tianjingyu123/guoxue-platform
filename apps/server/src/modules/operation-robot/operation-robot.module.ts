import { Module } from "@nestjs/common";
import { OperationRobotService } from "./operation-robot.service";
import { OperationRobotController } from "./operation-robot.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { ScheduleModule } from "@nestjs/schedule";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [AiGatewayModule, ScheduleModule, SystemModule],
  controllers: [OperationRobotController],
  providers: [OperationRobotService],
  exports: [OperationRobotService],
})
export class OperationRobotModule {}
