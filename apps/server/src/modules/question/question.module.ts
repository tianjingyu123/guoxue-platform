import { Module } from "@nestjs/common";
import { QuestionService } from "./question.service";
import { QuestionController } from "./question.controller";
import { CoinModule } from "../coin/coin.module";
import { RevenueModule } from "../revenue/revenue.module";

@Module({
  imports: [CoinModule, RevenueModule],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
