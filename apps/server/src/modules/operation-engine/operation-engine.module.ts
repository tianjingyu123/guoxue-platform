import { Module } from "@nestjs/common";
import { OperationEngineService } from "./operation-engine.service";
import { OperationEngineController } from "./operation-engine.controller";
import { ContentGenerationModule } from "../content-generation/content-generation.module";

@Module({
  imports: [ContentGenerationModule],
  controllers: [OperationEngineController],
  providers: [OperationEngineService],
  exports: [OperationEngineService],
})
export class OperationEngineModule {}
