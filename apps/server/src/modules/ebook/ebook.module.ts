import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EbookController } from "./ebook.controller";
import { EbookService } from "./ebook.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || "default-secret" }), AiModule],
  controllers: [EbookController],
  providers: [EbookService],
  exports: [EbookService],
})
export class EbookModule {}
