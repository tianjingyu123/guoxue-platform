import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { VodService } from "./vod.service";
import { VideoCreatorService } from "./video-creator.service";
import { VideoController } from "./video.controller";
import { VideoCreatorController } from "./video-creator.controller";
import { AuditModule } from "../audit/audit.module";
import { CircleModule } from "../circle/circle.module";

@Module({
  imports: [AuditModule, CircleModule],
  controllers: [VideoController, VideoCreatorController],
  providers: [VideoService, VodService, VideoCreatorService],
  exports: [VideoService, VodService, VideoCreatorService],
})
export class VideoModule {}
