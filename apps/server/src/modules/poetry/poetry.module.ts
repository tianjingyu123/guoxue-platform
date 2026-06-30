import { Module } from "@nestjs/common";
import { PoetryController } from "./poetry.controller";
import { PoetryService } from "./poetry.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AiGatewayModule],
  controllers: [PoetryController],
  providers: [PoetryService],
})
export class PoetryModule {}
