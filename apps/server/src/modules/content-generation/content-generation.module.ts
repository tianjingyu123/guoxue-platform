import { Module } from "@nestjs/common";
import { ContentGenerationService } from "./content-generation.service";
import { ContentGenerationController } from "./content-generation.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [AiGatewayModule, ScheduleModule],
  controllers: [ContentGenerationController],
  providers: [ContentGenerationService],
  exports: [ContentGenerationService],
})
export class ContentGenerationModule {}
