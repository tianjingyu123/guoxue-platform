import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { WeworkService } from "./wework.service";
import { SmartPushService } from "./smart-push.service";
import { NotificationController } from "./notification.controller";
import { AuthModule } from "../auth/auth.module";
import { RedisModule } from "../../redis/redis.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
// 注意：不 import UserModule（UserModule→InteractionModule→NotificationModule 会成环）。
// PushAudienceService 无状态且只依赖全局 PrismaService，直接在本模块再 provide 一份，圈人口径由代码唯一保证。
import { PushAudienceService } from "../user/push-audience.service";

@Module({
  imports: [AuthModule, RedisModule, AiGatewayModule],
  controllers: [NotificationController],
  providers: [NotificationService, PushService, WeworkService, SmartPushService, PushAudienceService],
  exports: [NotificationService, PushService, WeworkService, SmartPushService],
})
export class NotificationModule {}
