import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { WeworkService } from "./wework.service";
import { SmartPushService } from "./smart-push.service";
import { NotificationController } from "./notification.controller";
import { AuthModule } from "../auth/auth.module";
import { RedisModule } from "../../redis/redis.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AuthModule, RedisModule, AiGatewayModule],
  controllers: [NotificationController],
  providers: [NotificationService, PushService, WeworkService, SmartPushService],
  exports: [NotificationService, PushService, WeworkService, SmartPushService],
})
export class NotificationModule {}
