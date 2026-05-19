import { Module } from "@nestjs/common"
import { TtsController } from "./tts.controller"
import { TtsService } from "./tts.service"
import { RedisModule } from "../../redis/redis.module"

@Module({
  imports: [RedisModule],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
