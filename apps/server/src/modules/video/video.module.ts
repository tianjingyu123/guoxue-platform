import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { VodService } from "./vod.service";
import { VideoController } from "./video.controller";

@Module({
  controllers: [VideoController],
  providers: [VideoService, VodService],
  exports: [VideoService, VodService],
})
export class VideoModule {}
