import { Module } from "@nestjs/common";
import { ContentGenerationService } from "./content-generation.service";
import { OperationalSeedService } from "./operational-seed.service";
import { ContentGenerationController } from "./content-generation.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [AiGatewayModule, ScheduleModule],
  controllers: [ContentGenerationController],
  providers: [ContentGenerationService, OperationalSeedService],
  exports: [ContentGenerationService, OperationalSeedService],
})
export class ContentGenerationModule {}
