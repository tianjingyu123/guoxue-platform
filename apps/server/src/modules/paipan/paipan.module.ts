import { Module } from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanController } from "./paipan.controller";

@Module({
  controllers: [PaipanController],
  providers: [PaipanService],
  exports: [PaipanService],
})
export class PaipanModule {}
