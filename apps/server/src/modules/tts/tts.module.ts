import { Module } from "@nestjs/common"
import { TtsController } from "./tts.controller"
import { TtsService } from "./tts.service"
import { AudioAssetService } from "./audio-asset.service"
import { VolcengineTtsAdapter } from "./volcengine-tts.adapter"
import { AudiobookService } from "./audiobook.service"
import { AudiobookController } from "./audiobook.controller"
import { RedisModule } from "../../redis/redis.module"
import { UploadModule } from "../upload/upload.module"

@Module({
  imports: [RedisModule, UploadModule],
  controllers: [TtsController, AudiobookController],
  providers: [TtsService, AudioAssetService, VolcengineTtsAdapter, AudiobookService],
  exports: [TtsService, AudioAssetService, AudiobookService],
})
export class TtsModule {}
