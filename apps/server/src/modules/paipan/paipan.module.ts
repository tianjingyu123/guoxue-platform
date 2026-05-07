import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";
import { PaipanAiService } from "./paipan-ai.service";

@Module({
  controllers: [PaipanController],
  providers: [PaipanService, PaipanAiService],
  exports: [PaipanService, PaipanAiService],
})
export class PaipanModule {}
