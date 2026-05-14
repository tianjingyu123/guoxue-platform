import { Module } from "@nestjs/common";
import { OperationRobotService } from "./operation-robot.service";
import { OperationRobotController } from "./operation-robot.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [AiGatewayModule, ScheduleModule],
  controllers: [OperationRobotController],
  providers: [OperationRobotService],
  exports: [OperationRobotService],
})
export class OperationRobotModule {}
