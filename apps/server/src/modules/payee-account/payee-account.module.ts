import { Module } from "@nestjs/common";
import { PayeeAccountService } from "./payee-account.service";
import { PayeeAccountController } from "./payee-account.controller";
import { HuifuModule } from "../huifu/huifu.module";

/** 收款主体（分账接收方）进件 —— 资金架构地基，见 docs/design/资金与分账架构-设计文档-20260714.md */
@Module({
  imports: [HuifuModule],
  controllers: [PayeeAccountController],
  providers: [PayeeAccountService],
  exports: [PayeeAccountService],
})
export class PayeeAccountModule {}
