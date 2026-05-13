import { Module } from "@nestjs/common";
import { ClassicController } from "./classic.controller";
import { ClassicService } from "./classic.service";
import { ClassicQaController } from "./classic-qa.controller";
import { ClassicQaService } from "./classic-qa.service";
import { ClassicIndexTask } from "./classic-index.task";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AiGatewayModule],
  controllers: [ClassicController, ClassicQaController],
  providers: [ClassicService, ClassicQaService, ClassicIndexTask],
  exports: [ClassicService, ClassicQaService],
})
export class ClassicModule {}
