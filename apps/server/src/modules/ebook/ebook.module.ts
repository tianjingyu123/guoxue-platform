import { Module } from "@nestjs/common";
import { EbookController } from "./ebook.controller";
import { EbookService } from "./ebook.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [EbookController],
  providers: [EbookService],
  exports: [EbookService],
})
export class EbookModule {}
