import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { CozeService } from "./coze.service";
import { BotController } from "./bot.controller";
import { RecommendationService } from "./recommendation.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CoinModule } from "../coin/coin.module";

@Module({
  imports: [AiGatewayModule, CoinModule],
  controllers: [BotController],
  providers: [BotService, CozeService, RecommendationService],
  exports: [BotService, CozeService],
})
export class BotModule {}
