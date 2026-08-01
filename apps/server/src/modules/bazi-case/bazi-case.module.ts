import { Module } from "@nestjs/common";
import { BaziCaseService } from "./bazi-case.service";
import { BaziCaseController, BaziCaseAdminController } from "./bazi-case.controller";
import { CoinModule } from "../coin/coin.module";

/** 八字案例库（爱好者练手 / 同类八字参考 / 投稿激励） */
@Module({
  imports: [CoinModule], // 投稿采纳后发国学币
  controllers: [BaziCaseController, BaziCaseAdminController],
  providers: [BaziCaseService],
  exports: [BaziCaseService],
})
export class BaziCaseModule {}
