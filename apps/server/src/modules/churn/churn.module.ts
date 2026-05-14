import { Module } from "@nestjs/common";
import { ChurnService } from "./churn.service";
import { ChurnController } from "./churn.controller";

@Module({
  controllers: [ChurnController],
  providers: [ChurnService],
  exports: [ChurnService],
})
export class ChurnModule {}
