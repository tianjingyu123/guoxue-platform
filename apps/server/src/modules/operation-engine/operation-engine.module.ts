import { Module } from "@nestjs/common";
import { OperationEngineService } from "./operation-engine.service";
import { OperationEngineController } from "./operation-engine.controller";

@Module({
  controllers: [OperationEngineController],
  providers: [OperationEngineService],
  exports: [OperationEngineService],
})
export class OperationEngineModule {}
