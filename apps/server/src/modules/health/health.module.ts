import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { DegradeService } from "./degrade.service";

@Module({
  controllers: [HealthController],
  providers: [HealthService, DegradeService],
  exports: [HealthService, DegradeService],
})
export class HealthModule {}
