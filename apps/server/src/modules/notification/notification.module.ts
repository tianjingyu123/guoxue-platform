import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { WeworkService } from "./wework.service";
import { NotificationController } from "./notification.controller";
import { AuthModule } from "../auth/auth.module";
import { RedisModule } from "../../redis/redis.module";

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [NotificationController],
  providers: [NotificationService, PushService, WeworkService],
  exports: [NotificationService, PushService, WeworkService],
})
export class NotificationModule {}
