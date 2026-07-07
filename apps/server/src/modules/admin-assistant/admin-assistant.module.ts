import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { AdminAssistantController } from "./admin-assistant.controller";
import { AdminAssistantService } from "./admin-assistant.service";

@Module({
  imports: [PrismaModule, AiGatewayModule],
  controllers: [AdminAssistantController],
  providers: [AdminAssistantService],
})
export class AdminAssistantModule {}
