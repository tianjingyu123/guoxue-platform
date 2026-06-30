import { Module } from "@nestjs/common";
import { TrackService } from "./track.service";
import { TrackController } from "./track.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // OptionalAuthGuard 依赖 AuthModule 提供的 jwt strategy
  controllers: [TrackController],
  providers: [TrackService],
  exports: [TrackService],
})
export class TrackModule {}
