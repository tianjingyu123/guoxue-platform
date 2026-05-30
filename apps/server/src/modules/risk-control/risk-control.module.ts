import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RiskControlService } from "./risk-control.service";
import { RiskControlController } from "./risk-control.controller";

@Module({
  imports: [ScheduleModule],
  controllers: [RiskControlController],
  providers: [RiskControlService],
  exports: [RiskControlService],
})
export class RiskControlModule {}
