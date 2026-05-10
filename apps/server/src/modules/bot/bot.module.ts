import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { CozeService } from "./coze.service";
import { BotController } from "./bot.controller";

@Module({
  controllers: [BotController],
  providers: [BotService, CozeService],
  exports: [BotService, CozeService],
})
export class BotModule {}
