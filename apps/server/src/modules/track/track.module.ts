import { Module } from "@nestjs/common";
import { TrackService } from "./track.service";
import { TrackController } from "./track.controller";
import { InsightService } from "./insight.service";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [AuthModule, UserModule], // OptionalAuthGuard 依赖 AuthModule 提供的 jwt strategy
  controllers: [TrackController],
  providers: [TrackService, InsightService],
  exports: [TrackService, InsightService],
})
export class TrackModule {}
