import { Module } from "@nestjs/common";
import { ZidianService } from "./zidian.service";
import { ZidianAiService } from "./zidian-ai.service";
import { ZidianController } from "./zidian.controller";

@Module({
  controllers: [ZidianController],
  providers: [ZidianService, ZidianAiService],
  exports: [ZidianService],
})
export class ZidianModule {}
