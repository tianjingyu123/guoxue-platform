import { Module } from "@nestjs/common"
import { TtsController } from "./tts.controller"
import { TtsService } from "./tts.service"
import { AudioAssetService } from "./audio-asset.service"
import { VolcengineTtsAdapter } from "./volcengine-tts.adapter"
import { RedisModule } from "../../redis/redis.module"
import { UploadModule } from "../upload/upload.module"

@Module({
  imports: [RedisModule, UploadModule],
  controllers: [TtsController],
  providers: [TtsService, AudioAssetService, VolcengineTtsAdapter],
  exports: [TtsService, AudioAssetService],
})
export class TtsModule {}
