import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EbookController } from "./ebook.controller";
import { EbookService } from "./ebook.service";
import { MemberGuard } from "../../common/member.guard";
import { AiModule } from "../ai/ai.module";
import { MemberModule } from "../member/member.module";

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || "default-secret" }), AiModule, MemberModule],
  controllers: [EbookController],
  providers: [EbookService, MemberGuard],
  exports: [EbookService],
})
export class EbookModule {}
